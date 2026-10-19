---
id: 003-T02
status: done            # todo | doing | blocked | done
depends_on: []
covers: [AC-11]
---

# 003-T02 — Configuración de Keycloak

## Objetivo
`AppConfig` incluye `auth: { issuerUrl, audience }` desde `KEYCLOAK_ISSUER_URL` (obligatoria) y `KEYCLOAK_AUDIENCE` (def. `core-service`).

## Contexto (leer SOLO esto)
- `src/shared/infrastructure/config/app-config.ts`
- `src/shared/infrastructure/config/app-config.spec.ts`
- `test/support/test-env.ts`
- `../traccar-adapter/src/shared/infrastructure/config/app-config.ts`

## Contrato
```ts
export interface AuthConfig { readonly issuerUrl: string; readonly audience: string }   // issuer sin "/" final
```

## Archivos a crear/modificar
- [x] `src/shared/infrastructure/config/app-config.ts` (modificado) + spec
- [x] `test/image/docker.ts` (`VALID_ENV.KEYCLOAK_ISSUER_URL = "http://keycloak.invalid/realms/telemetry"`, para que `pnpm test:image` y el job `image` de CI sigan en verde)
- [x] `test/support/test-env.ts` (`TEST_ENV.KEYCLOAK_ISSUER_URL = "http://keycloak.test/realms/telemetry"`; `testConfig` admite override de `auth`)

## Criterios de aceptación
- [x] **AC-11** — Falta `KEYCLOAK_ISSUER_URL` o no es URL → `ConfigValidationError` que la nombra; `KEYCLOAK_AUDIENCE` por defecto `core-service`; se quitan barras finales del issuer.

## Notas
Los tests e2e existentes (001) deben seguir pasando: usan `testConfig()`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
pnpm test:image
```

## Handoff
Añadido `auth: { issuerUrl, audience }` (`AuthConfig`) a `AppConfig`, validando `KEYCLOAK_ISSUER_URL` (URL requerida sin barra final) y `KEYCLOAK_AUDIENCE` (def. `core-service`).
Actualizados `TEST_ENV`, `testConfig` y `VALID_ENV` para suite e2e e image tests. Desbloquea T03.
