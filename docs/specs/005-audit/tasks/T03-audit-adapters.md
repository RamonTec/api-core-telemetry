---
id: 005-T03
status: todo           # todo | doing | blocked | done
depends_on: [005-T02]
covers: [AC-1, AC-3, AC-6, AC-7]
---

# 005-T03 — Adaptadores (pino, reloj, UUID v7) y AuditModule global

## Objetivo
Los adaptadores del sistema existen y se proveen globalmente con sus tokens.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/infrastructure/audit/pino-audit-log.adapter.ts`
- `../traccar-adapter/src/shared/infrastructure/audit/system-clock.ts`
- `../traccar-adapter/src/shared/infrastructure/audit/audit.module.ts`
- `../traccar-adapter/src/shared/infrastructure/audit/pino-audit-log.adapter.spec.ts`
- `src/app.module.ts`

## Contrato
```ts
export class PinoAuditLogAdapter implements AuditLogPort    // new Logger('Audit'); línea = { ...fields, msg: op, op, actor, tenantId, result, durationMs } sin undefined; log/warn; nunca lanza
export class SystemClock implements ClockPort               // now(): performance.now(); nowDate(): new Date()
export class UuidV7IdGenerator implements IdGeneratorPort   // import { v7 } from 'uuid'
@Global() @Module({ providers: [...3 tokens], exports: [...] }) export class AuditModule {}
```

## Archivos a crear/modificar
- [ ] `src/shared/infrastructure/audit/{pino-audit-log.adapter,system-clock,uuid-v7-id-generator,audit.module}.ts` (nuevos) + specs
- [ ] `src/app.module.ts` (importa `AuditModule`); `package.json` (`pnpm add uuid@^14`)

## Criterios de aceptación
- [ ] **AC-1/3/6** — Spec del adapter con `createLogCapture`: `context:"Audit"`, nivel según `succeeded`, campos fijos no sobrescribibles, sin `undefined`.
- [ ] **AC-7** — `UuidV7IdGenerator.next()` cumple el formato v7 y dos ids consecutivos son crecientes.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
