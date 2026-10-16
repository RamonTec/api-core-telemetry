---
spec: 005-audit
status: draft          # draft | approved
---

# 005 — Diseño

Base: traccar-adapter 012 (`../traccar-adapter/src/shared/application/{run-audited.ts,ports/*}`,
`../traccar-adapter/src/shared/infrastructure/audit/*`). Cambios: el actor es un `Actor` (003) y la línea lleva
`tenantId`; se añade `IdGeneratorPort`; `ClockPort` gana `nowDate()`.

## Componentes
| Capa | Archivo | N/M | Responsabilidad |
|------|---------|-----|-----------------|
| shared/application | `ports/audit-log.port.ts` (+ `__fakes__/audit-log.fake.ts`) | N | `AuditLogPort`, `AuditEvent`, `AUDIT_LOG_PORT` |
| shared/application | `ports/clock.port.ts` (+ fake) | N | `ClockPort` (`now()` monotónico, `nowDate()`), `CLOCK_PORT` |
| shared/application | `ports/id-generator.port.ts` (+ fake secuencial) | N | `IdGeneratorPort`, `ID_GENERATOR_PORT` |
| shared/application | `run-audited.ts` | N | Medir → ejecutar → clasificar → registrar → relanzar |
| shared/infra | `audit/pino-audit-log.adapter.ts` | N | `context: 'Audit'`, nunca lanza |
| shared/infra | `audit/system-clock.ts`, `audit/uuid-v7-id-generator.ts` | N | `performance.now()` / `new Date()`; `uuid` `v7()` |
| shared/infra | `audit/audit.module.ts` | N | `@Global()`: provee los tres tokens |
| raíz | `src/app.module.ts` | M | Importa `AuditModule` |

## Contratos internos
```ts
export interface AuditEvent {
  readonly op: string; readonly actor: string | undefined; readonly tenantId: string | undefined;
  readonly result: string; readonly succeeded: boolean; readonly durationMs: number;
  readonly fields: Readonly<Record<string, string | number>>;
}
export interface AuditLogPort { record(event: AuditEvent): void }
export interface ClockPort { now(): number; nowDate(): Date }
export interface IdGeneratorPort { next(): string }

export type AuditFields = Readonly<Record<string, string | number | undefined>>;
export interface AuditOutcome { readonly result: string; readonly fields?: AuditFields }
export interface AuditedOperation<T> {
  readonly op: string;
  readonly actor: Actor | undefined;
  readonly tenantId?: string;                 // obligatorio en operaciones del operador sobre un tenant
  readonly fields: AuditFields;
  success(output: T): AuditOutcome;
  failure(error: unknown): AuditOutcome;      // por defecto { result: 'failed' }
}
export interface AuditDeps { readonly audit: AuditLogPort; readonly clock: ClockPort }
export function runAudited<T>(deps: AuditDeps, operation: AuditedOperation<T>, run: () => Promise<T>): Promise<T>;
// tenantId de la línea = operation.tenantId ?? (actor?.kind === 'tenant-user' ? actor.tenantId : undefined)
// línea del adapter = { ...fields, msg: op, op, actor, tenantId, result, durationMs } (fijos al final; undefined omitidos)
```

## Decisiones
- `uuid` (v14) para UUID v7: `crypto.randomUUID()` solo genera v4.
- Fake de ids secuencial y determinista (`00000000-0000-7000-8000-000000000001`, …) para tests de use cases.
