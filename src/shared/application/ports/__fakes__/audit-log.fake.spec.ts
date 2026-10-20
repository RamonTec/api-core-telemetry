import type { AuditEvent } from '../audit-log.port.js';
import { FakeAuditLog } from './audit-log.fake.js';

describe('FakeAuditLog', () => {
  const sampleEvent: AuditEvent = {
    op: 'user.login',
    actor: 'usr-123',
    tenantId: 'ten-456',
    result: 'success',
    succeeded: true,
    durationMs: 35,
    fields: { ip: '127.0.0.1' },
  };

  it('records audit events in order', () => {
    const fake = new FakeAuditLog();
    expect(fake.events).toEqual([]);

    fake.record(sampleEvent);
    expect(fake.events).toEqual([sampleEvent]);

    const secondEvent: AuditEvent = {
      ...sampleEvent,
      op: 'user.logout',
      durationMs: 12,
    };
    fake.record(secondEvent);
    expect(fake.events).toEqual([sampleEvent, secondEvent]);
  });

  it('throws and resets failNext when failNext is true', () => {
    const fake = new FakeAuditLog();
    fake.failNext = true;

    expect(() => fake.record(sampleEvent)).toThrow(
      'FakeAuditLog: simulated recording failure',
    );
    expect(fake.failNext).toBe(false);
    expect(fake.events).toHaveLength(0);

    // Subsequent call should succeed
    fake.record(sampleEvent);
    expect(fake.events).toEqual([sampleEvent]);
  });

  it('clears events and resets failNext on reset()', () => {
    const fake = new FakeAuditLog();
    fake.record(sampleEvent);
    fake.failNext = true;

    fake.reset();
    expect(fake.events).toHaveLength(0);
    expect(fake.failNext).toBe(false);
  });
});
