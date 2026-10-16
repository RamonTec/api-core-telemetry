---
id: 001-T04
status: todo           # todo | doing | blocked | done
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
- [ ] `src/shared/infrastructure/http/http-exception.filter.ts` (nuevo) + spec
- [ ] `src/shared/infrastructure/http/zod-validation.pipe.ts` (nuevo) + spec

## Criterios de aceptación
- [ ] **AC-8** — `DomainError` mapeado → su status y `{code,message,correlationId,details?}`.
- [ ] **AC-9** — Error no controlado → `500 INTERNAL_ERROR` sin detalles + log `error` con el error.
- [ ] **AC-10** — `NotFoundException` → `404 NOT_FOUND`.
- [ ] **AC-11** — Esquema zod inválido → `400 VALIDATION_ERROR` con `details`.

## Fuera de alcance
- Registro global del filtro (T06).

## Verificación
```bash
pnpm check
```

## Handoff
