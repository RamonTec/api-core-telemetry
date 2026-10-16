---
id: 005-audit
status: draft          # draft | approved | in-progress | done
requirements: [FND-FR9]
adrs: [0003]
---

# 005 — Auditoría, reloj e identificadores

## Problema
Toda escritura de negocio debe dejar una línea de auditoría (quién, tenant, qué, resultado, duración) emitida por el
caso de uso (ADR-0003). Además, los casos de uso necesitan **reloj** e **ids** inyectables para ser testeables sin
tiempo ni aleatoriedad reales (ids UUID v7, `docs/standards/coding.md`). Se porta la auditoría de traccar-adapter 012
añadiendo el tenant.

## Alcance
- Incluye: `AuditLogPort`, `ClockPort`, `IdGeneratorPort` y sus fakes; helper `runAudited`; adaptadores (pino,
  reloj del sistema, UUID v7); módulo global.
- **No incluye**: casos de uso de negocio que lo usen (fase 1+), persistir la auditoría en BD.

## Comportamiento (criterios de aceptación)
- **AC-1** — CUANDO termina una operación envuelta en `runAudited`, DEBE emitirse **exactamente una** línea con
  `msg` = `op`, `op`, `actor`, `tenantId` (si aplica), `result`, `durationMs` (entero ≥ 0) y `context: "Audit"`.
- **AC-2** — `actor` DEBE ser el `userId` del actor; `tenantId` DEBE ser el del actor de tenant o, en operaciones del
  operador de plataforma, el tenant objetivo declarado por la operación.
- **AC-3** — La línea DEBE ser `info` si la operación tuvo éxito y `warn` si fue rechazada o falló.
- **AC-4** — SI la operación lanza, ENTONCES el **mismo** error DEBE propagarse sin modificar.
- **AC-5** — SI falla la emisión de la línea, ENTONCES la operación DEBE completarse con su resultado normal.
- **AC-6** — Los ids de negocio de la operación NO DEBEN poder sobrescribir los campos fijos (`msg`, `op`, `actor`,
  `tenantId`, `result`, `durationMs`), y los campos `undefined` se omiten.
- **AC-7** — `IdGeneratorPort` del sistema DEBE generar UUID v7 (ordenables por tiempo); `ClockPort` DEBE dar tiempo
  monotónico en ms para medir y la hora actual (`Date`) para guardar.

## Contratos externos
- Línea de log `context: "Audit"` según PADR-001 §4 y `docs/standards/coding.md` › "Auditoría de operaciones".

## Preguntas abiertas
_Ninguna._
