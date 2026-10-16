---
id: 003-T02
status: todo           # todo | doing | blocked | done
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
- [ ] `src/shared/infrastructure/config/app-config.ts` (modificado) + spec
- [ ] `test/image/docker.ts` (`VALID_ENV.KEYCLOAK_ISSUER_URL = "http://keycloak.invalid/realms/telemetry"`, para que `pnpm test:image` y el job `image` de CI sigan en verde)
- [ ] `test/support/test-env.ts` (`TEST_ENV.KEYCLOAK_ISSUER_URL = "http://keycloak.test/realms/telemetry"`; `testConfig` admite override de `auth`)

## Criterios de aceptación
- [ ] **AC-11** — Falta `KEYCLOAK_ISSUER_URL` o no es URL → `ConfigValidationError` que la nombra; `KEYCLOAK_AUDIENCE` por defecto `core-service`; se quitan barras finales del issuer.

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
