---
id: 005-T02
status: todo           # todo | doing | blocked | done
depends_on: [005-T01]
covers: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
---

# 005-T02 — Helper runAudited con actor y tenant

## Objetivo
`runAudited` mide, ejecuta, clasifica, registra una sola línea (con `actor` y `tenantId`) y relanza el mismo error.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/application/run-audited.ts`
- `../traccar-adapter/src/shared/application/run-audited.spec.ts`
- `src/shared/application/actor.ts`
- `src/shared/application/ports/audit-log.port.ts`

## Contrato
```ts
export type AuditFields = Readonly<Record<string, string | number | undefined>>;
export interface AuditOutcome { readonly result: string; readonly fields?: AuditFields }
export interface AuditedOperation<T> { readonly op: string; readonly actor: Actor | undefined; readonly tenantId?: string;
  readonly fields: AuditFields; success(output: T): AuditOutcome; failure(error: unknown): AuditOutcome }
export interface AuditDeps { readonly audit: AuditLogPort; readonly clock: ClockPort }
export function runAudited<T>(deps: AuditDeps, operation: AuditedOperation<T>, run: () => Promise<T>): Promise<T>;
// actor de la línea = operation.actor?.userId; tenantId = operation.tenantId ?? (actor tenant-user ? actor.tenantId : undefined)
// durationMs = max(0, round(clock.now() - start)); record() dentro de try/catch (AC-5)
```

## Archivos a crear/modificar
- [ ] `src/shared/application/run-audited.ts` (nuevo) + spec

## Criterios de aceptación
- [ ] **AC-1** — Una sola llamada a `record` por ejecución, éxito o error.
- [ ] **AC-2** — Actor tenant → `tenantId` del actor; operador con `operation.tenantId` → ese tenant; sin actor → `actor` undefined.
- [ ] **AC-3** — `succeeded` true/false según el camino.
- [ ] **AC-4** — Relanza el mismo objeto de error.
- [ ] **AC-5** — `record` que lanza no altera el resultado.
- [ ] **AC-6** — `fields` sin `undefined`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
