# ADR-0003 — Auditoría de operaciones en la capa de aplicación (port)

- Estado: aceptado
- Fecha: 2026-10-16
- Origen: traccar-adapter ADR-0006, mismo diseño.

## Contexto
Toda escritura de negocio debe quedar registrada (quién, tenant, qué, resultado, duración). Si lo hiciera cada
controller, la clasificación del resultado quedaría acoplada al transporte y una operación invocada por otra vía no se
auditaría.

## Decisión
- `AuditLogPort` y `ClockPort` en `shared/application/ports`; helper `runAudited` que mide, ejecuta, clasifica, registra
  y relanza el mismo error.
- El use case recibe el `Actor` en su input y audita; los adaptadores de entrada no.
- `PinoAuditLogAdapter` emite una línea `context: 'Audit'` (`info` en éxito, `warn` si no) y nunca lanza.
- Respecto a traccar-adapter se añade **`tenantId`** como campo fijo de la línea.

## Consecuencias
- (+) Una línea por operación, sea cual sea el punto de entrada; testeable con un fake.
- (−) Cada use case de escritura declara su clasificación de resultados.
