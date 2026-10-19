import { Logger } from '@nestjs/common';
import type {
  AuditEvent,
  AuditLogPort,
} from '../../application/ports/audit-log.port.js';

/** Emits the audit line. Never throws. */
export class PinoAuditLogAdapter implements AuditLogPort {
  private readonly logger = new Logger('Audit');

  record(event: AuditEvent): void {
    try {
      // Fixed fields go last so a business id can never overwrite them.
      const rawLine: Record<string, unknown> = {
        ...event.fields,
        msg: event.op,
        op: event.op,
        actor: event.actor,
        tenantId: event.tenantId,
        result: event.result,
        durationMs: event.durationMs,
      };

      const line = Object.fromEntries(
        Object.entries(rawLine).filter(([, val]) => val !== undefined),
      );

      if (event.succeeded) {
        this.logger.log(line);
      } else {
        this.logger.warn(line);
      }
    } catch {
      // A failure to audit must never break the operation.
    }
  }
}
