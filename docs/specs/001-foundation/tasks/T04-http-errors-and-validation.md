---
id: 001-T04
status: done           # todo | doing | blocked | done
depends_on: [001-T01, 001-T03]
covers: [AC-8, AC-9, AC-10, AC-11]
---

# 001-T04 — Exception filter global y pipe de validación zod

## Objetivo
Toda excepción sale como `ErrorBody` (PADR-001 §3) y los DTO zod inválidos como `400 VALIDATION_ERROR` con `details`.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/infrastructure/http/http-exception.filter.ts`
- `../traccar-adapter/src/shared/infrastructure/http/http-exception.filter.spec.ts`
- `../traccar-adapter/src/shared/infrastructure/http/zod-validation.pipe.ts`
- `../traccar-adapter/src/shared/infrastructure/http/zod-validation.pipe.spec.ts`

## Contrato
```ts
export interface ErrorBody { code: string; message: string; correlationId: string; details?: unknown[] }
@Catch() export class HttpExceptionFilter implements ExceptionFilter { catch(exception: unknown, host: ArgumentsHost): void }
export class ZodValidationPipe implements PipeTransform { constructor(schema: z.ZodType) }   // lanza ValidationError(details [{path, message}])
```

## Archivos a crear/modificar
- [x] `src/shared/infrastructure/http/http-exception.filter.ts` (nuevo) + spec
- [x] `src/shared/infrastructure/http/zod-validation.pipe.ts` (nuevo) + spec

## Criterios de aceptación
- [x] **AC-8** — `DomainError` mapeado → su status y `{code,message,correlationId,details?}`.
- [x] **AC-9** — Error no controlado → `500 INTERNAL_ERROR` sin detalles + log `error` con el error.
- [x] **AC-10** — `NotFoundException` → `404 NOT_FOUND`.
- [x] **AC-11** — Esquema zod inválido → `400 VALIDATION_ERROR` con `details`.

## Fuera de alcance
- Registro global del filtro (T06).

## Verificación
```bash
pnpm check
```

## Handoff
- `HttpExceptionFilter` y `ErrorBody` exportados en `src/shared/infrastructure/http/http-exception.filter.ts` (listo para registrar con `APP_FILTER` en T06).
- `ZodValidationPipe` exportado en `src/shared/infrastructure/http/zod-validation.pipe.ts` lanzando `ValidationError` con `details: [{ path, message }]`.
- En el spec de integración del filtro se usó `LoggingModule.forRoot({ port: 0, logLevel: 'debug' }, logs.stream)` dado que `test/support/test-env.ts` llega en T07.

