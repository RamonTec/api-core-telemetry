---
id: 001-foundation
status: done           # draft | approved | in-progress | done
requirements: [FND-FR1, FND-FR2, FND-NFR4]
adrs: [0001, PADR-001]
---

# 001 — Foundation: configuración, logging, errores y salud

## Problema
core-service es el starter de NestJS. Antes de cualquier módulo de negocio hace falta la misma base que ya tiene
traccar-adapter: configuración validada al arrancar, logs estructurados con correlación, formato de error único,
endpoints de salud y apagado ordenado (PADR-001). Se **porta** de traccar-adapter en lugar de rediseñarla.

## Alcance
- Incluye: config por entorno (`PORT`, `LOG_LEVEL`); logger JSON con `correlationId`; log de cada request; `ErrorBody`
  y mapeo de errores; validación de entrada con zod (pipe); `GET /health`; `GET /health/ready` con registro de checks
  (vacío por ahora); apagado con `SIGTERM`; quitar el endpoint de ejemplo.
- **No incluye**: autenticación (003), BD (004), auditoría (005), Dockerfile/CI (002), contrato OpenAPI (006).

## Comportamiento (criterios de aceptación)
- **AC-1** — CUANDO las variables son válidas, el sistema DEBE escuchar en `PORT` (defecto `3000`).
- **AC-2** — SI alguna variable falta o es inválida, ENTONCES el proceso DEBE terminar con código ≠ 0 antes de escuchar,
  con una línea JSON en stderr que nombre **todas** las variables erróneas y nunca sus valores.
- **AC-3** — Cada línea de log DEBE ser JSON en stdout con `time`, `level` (etiqueta), `service: "core-service"`,
  `context`, `msg` y `correlationId` dentro de una request (PADR-001 §4).
- **AC-4** — CUANDO una request trae `x-correlation-id` válido (1-128 `[A-Za-z0-9._-]`), el sistema DEBE usarlo en sus
  logs y devolverlo en la respuesta; si falta o es inválido, DEBE generar un UUID v4 y usarlo igual.
- **AC-5** — Al terminar cada request DEBE emitirse un log con método, url, status, `responseTime` y `correlationId`;
  nivel `debug` para `/health*`, `error` para 5xx, `warn` para 4xx, `info` en otro caso.
- **AC-6** — Las cabeceras `authorization` y `cookie` NO DEBEN aparecer en ningún log.
- **AC-7** — El sistema NO DEBE emitir logs por debajo de `LOG_LEVEL` (`debug|info|warn|error`, defecto `info`).
- **AC-8** — SI un caso de uso lanza un `DomainError` con código mapeado, ENTONCES la respuesta DEBE usar su status y
  cuerpo `{ code, message, correlationId, details? }`.
- **AC-9** — SI ocurre un error no controlado, ENTONCES `500 { code: "INTERNAL_ERROR", … }` sin detalles internos, y el
  error completo DEBE loguearse a nivel `error` con el mismo `correlationId`.
- **AC-10** — Una ruta inexistente DEBE responder `404` con `code: "NOT_FOUND"` en el mismo formato.
- **AC-11** — Una entrada que no cumple su esquema zod DEBE responder `400 VALIDATION_ERROR` con `details`
  `[{ path, message }]`.
- **AC-12** — `GET /health` DEBE responder `200 { "status": "ok" }` sin depender de nada externo.
- **AC-13** — `GET /health/ready` DEBE responder `200 { status: "ok", checks: {} }` sin checks registrados; con checks
  registrados, `503` y `status: "error"` si falla uno crítico (los no críticos se informan como `"down"`).
- **AC-14** — CUANDO el proceso recibe `SIGTERM`, DEBE dejar de aceptar conexiones, completar las requests en curso y
  terminar con código `0`.
- **AC-15** — El endpoint de ejemplo del starter (`GET /`) NO DEBE existir.

## Contratos externos
- PADR-001: `x-correlation-id`, `ErrorBody`, tabla código → status, `GET /health`, `GET /health/ready`.
- Variables: `PORT` (opcional, 1-65535, def. 3000), `LOG_LEVEL` (opcional, def. `info`).

## Preguntas abiertas
_Ninguna._ Mismo diseño que traccar-adapter 001 (más el registro de readiness de 003/013 y el pipe zod de 004).
