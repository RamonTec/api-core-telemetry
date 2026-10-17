import { type INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { HealthModule } from './health.module.js';
import { ReadinessRegistry } from './readiness.registry.js';

describe('ReadinessRegistry & GET /health/ready', () => {
  it('AC-13: reports ok: true with empty checks when no checks are registered', async () => {
    const registry = new ReadinessRegistry();

    expect(await registry.run()).toEqual({
      ok: true,
      checks: {},
      info: {},
    });
  });

  it('AC-13: reports ok: false when a check throws, ok: true when check passes, and throws on duplicate registration', async () => {
    const registry = new ReadinessRegistry();

    registry.register('a', async () => true);
    registry.register('b', async () => {
      throw new Error('boom');
    });

    const result = await registry.run();
    expect(result).toEqual({
      ok: false,
      checks: {
        a: 'ok',
        b: 'error',
      },
      info: {},
    });

    expect(() => registry.register('a', async () => true)).toThrow(
      /already registered/i,
    );
  });

  it('AC-13: reports ok: true when all checks pass', async () => {
    const registry = new ReadinessRegistry();

    registry.register('check1', async () => true);
    registry.register('check2', async () => true);

    const result = await registry.run();
    expect(result).toEqual({
      ok: true,
      checks: {
        check1: 'ok',
        check2: 'ok',
      },
      info: {},
    });
  });

  it('AC-13: reports ok: false when a critical check returns false', async () => {
    const registry = new ReadinessRegistry();

    registry.register('check1', async () => false);

    const result = await registry.run();
    expect(result).toEqual({
      ok: false,
      checks: {
        check1: 'error',
      },
      info: {},
    });
  });

  it('AC-13: a failing non-critical check reports down without failing readiness', async () => {
    const registry = new ReadinessRegistry();
    registry.register('core', async () => true);
    registry.register('optional', async () => false, { critical: false });
    registry.register(
      'optional-throws',
      async () => {
        throw new Error('boom');
      },
      { critical: false },
    );

    expect(await registry.run()).toEqual({
      ok: true,
      checks: { core: 'ok', optional: 'down', 'optional-throws': 'down' },
      info: {},
    });
  });

  it('AC-13: registered info is included in the result and ignores throwing info providers', async () => {
    const registry = new ReadinessRegistry();
    registry.register('core', async () => true);
    registry.registerInfo('outbox', () => ({ pending: 2, oldestAgeMs: null }));
    registry.registerInfo('broken', () => {
      throw new Error('info failed');
    });

    expect((await registry.run()).info).toEqual({
      outbox: { pending: 2, oldestAgeMs: null },
    });
    expect(() => registry.registerInfo('outbox', () => ({}))).toThrow(
      /already registered/i,
    );
  });

  describe('GET /health/ready (integration)', () => {
    let app: INestApplication;
    let registry: ReadinessRegistry;

    beforeEach(async () => {
      const moduleRef = await Test.createTestingModule({
        imports: [HealthModule],
      }).compile();

      app = moduleRef.createNestApplication();
      registry = app.get(ReadinessRegistry);
      await app.init();
    });

    afterEach(async () => {
      if (app) {
        await app.close();
      }
    });

    it('AC-13: GET /health/ready without checks responds 200 { status: "ok", checks: {} }', async () => {
      const res = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(200);

      expect(res.body).toEqual({
        status: 'ok',
        checks: {},
      });
    });

    it('AC-13: GET /health/ready responds 503 with status "error" when a critical check fails and spreads info', async () => {
      registry.register('db', async () => false);
      registry.register('cache', async () => false, { critical: false });
      registry.registerInfo('outbox', () => ({ pending: 3 }));

      const res = await request(app.getHttpServer())
        .get('/health/ready')
        .expect(503);

      expect(res.body).toEqual({
        status: 'error',
        checks: { db: 'error', cache: 'down' },
        outbox: { pending: 3 },
      });
    });
  });
});
