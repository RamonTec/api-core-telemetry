import type { Actor } from './actor.js';
import { FakeAuditLog } from './ports/__fakes__/audit-log.fake.js';
import { FakeClock } from './ports/__fakes__/clock.fake.js';
import { type AuditedOperation, runAudited } from './run-audited.js';

class CustomError extends Error {}

function baseOperation(
  overrides: Partial<AuditedOperation<string>> = {},
): AuditedOperation<string> {
  return {
    op: 'item.create',
    actor: {
      kind: 'tenant-user',
      userId: 'usr-1',
      tenantId: 'ten-1',
      roles: ['tenant-admin'],
    },
    fields: { name: 'sample' },
    success: (out) => ({ result: 'created', fields: { length: out.length } }),
    failure: (err) => ({
      result: err instanceof CustomError ? 'custom_failure' : 'unknown_failure',
    }),
    ...overrides,
  };
}

describe('runAudited', () => {
  let audit: FakeAuditLog;
  let clock: FakeClock;

  beforeEach(() => {
    audit = new FakeAuditLog();
    clock = new FakeClock(100);
  });

  it('AC-1: una sola llamada a record por ejecución en éxito', async () => {
    const output = await runAudited(
      { audit, clock },
      baseOperation(),
      async () => {
        clock.advance(25);
        return 'ok';
      },
    );

    expect(output).toBe('ok');
    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      op: 'item.create',
      result: 'created',
      durationMs: 25,
    });
  });

  it('AC-1: una sola llamada a record por ejecución en error', async () => {
    const error = new CustomError('failed');

    await expect(
      runAudited({ audit, clock }, baseOperation(), async () => {
        clock.advance(10);
        throw error;
      }),
    ).rejects.toBe(error);

    expect(audit.events).toHaveLength(1);
    expect(audit.events[0]).toMatchObject({
      op: 'item.create',
      result: 'custom_failure',
      durationMs: 10,
    });
  });

  it('AC-2: actor tenant -> tenantId del actor; operador con operation.tenantId -> ese tenant; sin actor -> actor undefined', async () => {
    // 1. Tenant user actor
    const tenantActor: Actor = {
      kind: 'tenant-user',
      userId: 'usr-tenant',
      tenantId: 'ten-abc',
      roles: ['tenant-operator'],
    };
    await runAudited(
      { audit, clock },
      baseOperation({ actor: tenantActor }),
      () => Promise.resolve('ok'),
    );
    expect(audit.events[0]?.actor).toBe('usr-tenant');
    expect(audit.events[0]?.tenantId).toBe('ten-abc');

    // 2. Platform operator actor with operation.tenantId
    const operatorActor: Actor = {
      kind: 'platform-operator',
      userId: 'usr-operator',
    };
    await runAudited(
      { audit, clock },
      baseOperation({ actor: operatorActor, tenantId: 'ten-override' }),
      () => Promise.resolve('ok'),
    );
    expect(audit.events[1]?.actor).toBe('usr-operator');
    expect(audit.events[1]?.tenantId).toBe('ten-override');

    // 3. Platform operator without operation.tenantId
    await runAudited(
      { audit, clock },
      baseOperation({ actor: operatorActor, tenantId: undefined }),
      () => Promise.resolve('ok'),
    );
    expect(audit.events[2]?.actor).toBe('usr-operator');
    expect(audit.events[2]?.tenantId).toBeUndefined();

    // 4. Sin actor
    await runAudited(
      { audit, clock },
      baseOperation({ actor: undefined, tenantId: undefined }),
      () => Promise.resolve('ok'),
    );
    expect(audit.events[3]?.actor).toBeUndefined();
    expect(audit.events[3]?.tenantId).toBeUndefined();
  });

  it('AC-3: succeeded es true en éxito y false en error', async () => {
    await runAudited({ audit, clock }, baseOperation(), () =>
      Promise.resolve('ok'),
    );
    expect(audit.events[0]?.succeeded).toBe(true);

    await expect(
      runAudited({ audit, clock }, baseOperation(), () =>
        Promise.reject(new Error('fail')),
      ),
    ).rejects.toThrow();
    expect(audit.events[1]?.succeeded).toBe(false);
  });

  it('AC-4: relanza el mismo objeto de error', async () => {
    const errorInstance = new CustomError('exact error reference');

    await expect(
      runAudited({ audit, clock }, baseOperation(), async () => {
        throw errorInstance;
      }),
    ).rejects.toBe(errorInstance);
  });

  it('AC-5: record que lanza no altera el resultado (éxito o error)', async () => {
    audit.failNext = true;

    // En éxito, retorna el resultado normal
    const res = await runAudited({ audit, clock }, baseOperation(), () =>
      Promise.resolve('ok'),
    );
    expect(res).toBe('ok');

    // En error, relanza el error original de la operación sin verse afectado por el fallo de auditoría
    audit.failNext = true;
    const error = new CustomError('business error');
    await expect(
      runAudited({ audit, clock }, baseOperation(), () =>
        Promise.reject(error),
      ),
    ).rejects.toBe(error);
  });

  it('AC-6: fields sin undefined (campos base y outcome combinados)', async () => {
    await runAudited(
      { audit, clock },
      baseOperation({
        fields: { present: 'yes', missing: undefined, count: 5 },
        success: () => ({
          result: 'created',
          fields: { outcomeField: 'done', outcomeMissing: undefined },
        }),
      }),
      () => Promise.resolve('ok'),
    );

    expect(audit.events[0]?.fields).toEqual({
      present: 'yes',
      count: 5,
      outcomeField: 'done',
    });
  });
});
