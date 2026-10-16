---
id: 001-T03
status: done           # todo | doing | blocked | done
depends_on: [001-T02]
covers: [AC-3, AC-4, AC-5, AC-6, AC-7]
---

# 001-T03 — Logging estructurado con correlation id (nestjs-pino)

## Objetivo
`LoggingModule.forRoot(config, stream?)` produce logs JSON según PADR-001 §4 con `service: "core-service"`, correlation id y log de request.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/infrastructure/logging/correlation-id.ts`
- `../traccar-adapter/src/shared/infrastructure/logging/pino-http-options.ts`
- `../traccar-adapter/src/shared/infrastructure/logging/logging.module.ts`
- `../traccar-adapter/src/shared/infrastructure/logging/logging.module.spec.ts`
- `../traccar-adapter/test/support/log-capture.ts`

## Contrato
```ts
export const CORRELATION_ID_HEADER = 'x-correlation-id';
export function resolveCorrelationId(header: string | string[] | undefined, generate?: () => string): string;
export const SERVICE_NAME = 'core-service';
export function buildPinoHttpOptions(config: Pick<AppConfig, 'logLevel'>): Options;
export class LoggingModule { static forRoot(config: AppConfig, stream?: DestinationStream): DynamicModule }
```

## Archivos a crear/modificar
- [x] `src/shared/infrastructure/logging/correlation-id.ts`, `pino-http-options.ts`, `logging.module.ts` (nuevos) + specs
- [x] `test/support/log-capture.ts` (nuevo, copiado)
- [x] `package.json` (`pnpm add nestjs-pino pino pino-http`, versiones de traccar-adapter)

## Criterios de aceptación
- [x] **AC-3** — Cada línea tiene `time` ISO, `level` etiqueta, `service:"core-service"`, `context`, `msg`.
- [x] **AC-4** — Header válido se respeta; ausente/inválido → UUID v4.
- [x] **AC-5** — Niveles del log de request: `debug` `/health*`, `error` 5xx, `warn` 4xx, `info` resto.
- [x] **AC-6** — `authorization` y `cookie` redactados (no aparecen).
- [x] **AC-7** — Respeta `LOG_LEVEL`.

## Notas
En `pino-http-options.ts` quitar `customProps.actor` (el actor llega en 003) y cualquier referencia a webhooks.

## Fuera de alcance
- Actor/tenant en el log (003).

## Verificación
```bash
pnpm check
```

## Handoff
LoggingModule configurado con nestjs-pino y pino-http con correlation id, redactado de cabeceras sensibles y formato estructurado JSON con service: "core-service". Listo para ser importado en AppModule (T06) y utilizado por el exception filter (T04).
