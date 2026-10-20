export const AUDIT_LOG_PORT = Symbol('AuditLogPort');

export interface AuditEvent {
  readonly op: string;
  readonly actor: string | undefined;
  readonly tenantId: string | undefined;
  readonly result: string;
  readonly succeeded: boolean;
  readonly durationMs: number;
  readonly fields: Readonly<Record<string, string | number>>;
}

export interface AuditLogPort {
  record(event: AuditEvent): void;
}
