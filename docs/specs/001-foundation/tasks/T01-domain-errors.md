---
id: 001-T01
status: done           # todo | doing | blocked | done
depends_on: []
covers: [AC-8]
---

# 001-T01 — Errores de dominio y tabla código ↔ status

## Objetivo
Existen `DomainError`, `ValidationError`, `UpstreamUnavailableError` y la tabla código ↔ HTTP status de PADR-001, portados de traccar-adapter.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/domain/domain-error.ts`
- `../traccar-adapter/src/shared/domain/validation.error.ts`
- `../traccar-adapter/src/shared/domain/upstream-unavailable.error.ts`
- `../traccar-adapter/src/shared/infrastructure/http/error-http-status.ts`
- `../traccar-adapter/src/shared/infrastructure/http/error-http-status.spec.ts`

## Contrato
```ts
export const GENERIC_ERROR_HTTP_STATUS = { VALIDATION_ERROR: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, UPSTREAM_UNAVAILABLE: 503, INTERNAL_ERROR: 500 };
export const ERROR_HTTP_STATUS = { ...GENERIC_ERROR_HTTP_STATUS };   // sin códigos de Traccar (GROUP_*, DEVICE_*)
export function httpStatusForCode(code: string): number | undefined;
export function codeForHttpStatus(status: number): string;          // 4xx sin mapear → 'BAD_REQUEST', resto → 'INTERNAL_ERROR'
```

## Archivos a crear/modificar
- [x] `src/shared/domain/domain-error.ts`, `validation.error.ts`, `upstream-unavailable.error.ts` (nuevos)
- [x] `src/shared/infrastructure/http/error-http-status.ts` (nuevo) + `.spec.ts`

## Criterios de aceptación
- [x] **AC-8** — `httpStatusForCode` devuelve el status de cada código genérico y `undefined` para uno desconocido o heredado (`constructor`); `codeForHttpStatus` es el inverso.

## Fuera de alcance
- El exception filter (T04).

## Verificación
```bash
pnpm check
```

## Handoff
Portados DomainError, ValidationError, UpstreamUnavailableError y la tabla bidireccional código ↔ status HTTP de PADR-001 sin dependencias externas ni acoplamientos de Traccar. Listo para ser consumido por T04 (exception filter global).
