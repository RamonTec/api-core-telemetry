import type { AuditEvent, AuditLogPort } from '../audit-log.port.js';

export class FakeAuditLog implements AuditLogPort {
  readonly events: AuditEvent[] = [];
  failNext?: boolean;

  record(event: AuditEvent): void {
    if (this.failNext) {
      this.failNext = false;
      throw new Error('FakeAuditLog: simulated recording failure');
    }
    this.events.push(event);
  }

  reset(): void {
    this.events.length = 0;
    this.failNext = false;
  }
}
