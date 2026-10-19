---
id: 005-T01
status: done           # todo | doing | blocked | done
depends_on: []
covers: [AC-7]
---

# 005-T01 — Ports de auditoría, reloj e ids con sus fakes

## Objetivo
Existen los tres ports transversales y fakes deterministas para los tests de use cases.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/application/ports/audit-log.port.ts`
- `../traccar-adapter/src/shared/application/ports/clock.port.ts`
- `../traccar-adapter/src/shared/application/ports/__fakes__/audit-log.fake.ts`
- `../traccar-adapter/src/shared/application/ports/__fakes__/clock.fake.ts`

## Contrato
```ts
export interface AuditEvent { readonly op: string; readonly actor: string | undefined; readonly tenantId: string | undefined;
  readonly result: string; readonly succeeded: boolean; readonly durationMs: number; readonly fields: Readonly<Record<string, string | number>> }
export interface AuditLogPort { record(event: AuditEvent): void }          export const AUDIT_LOG_PORT = Symbol('AuditLogPort');
export interface ClockPort { now(): number; nowDate(): Date }              export const CLOCK_PORT = Symbol('ClockPort');
export interface IdGeneratorPort { next(): string }                        export const ID_GENERATOR_PORT = Symbol('IdGeneratorPort');

// fakes: FakeAuditLog { events: AuditEvent[]; failNext?: boolean }, FakeClock { set(ms); advance(ms); setDate(d) },
//        FakeIdGenerator → '00000000-0000-7000-8000-000000000001', …002, … (12 dígitos finales, secuencial)
```

## Archivos a crear/modificar
- [x] `src/shared/application/ports/{audit-log,clock,id-generator}.port.ts` (nuevos)
- [x] `src/shared/application/ports/__fakes__/{audit-log,clock,id-generator}.fake.ts` (nuevos) + spec de los fakes

## Criterios de aceptación
- [x] **AC-7** — El fake de ids es secuencial y con formato UUID v7 (`/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/`).

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
- Creados los ports `AuditLogPort`, `ClockPort` e `IdGeneratorPort` con sus tokens Symbol.
- Implementados `FakeAuditLog` (con captura y `failNext`), `FakeClock` (`set`, `setDate`, `advance`) y `FakeIdGenerator` (secuencial UUID v7).
- Cobertura de tests unitarios al 100% para los tres fakes (cumpliendo AC-7).
