---
id: 006-T01
status: todo           # todo | doing | blocked | done
depends_on: []
covers: [AC-1, AC-2]
---

# 006-T01 — openapi.yaml inicial, cargador y test de validez

## Objetivo
Existe `docs/contracts/openapi.yaml` 3.1 con health, seguridad de usuario y `ErrorBody`, y `pnpm check` falla si no es válido.

## Contexto (leer SOLO esto)
- `../traccar-adapter/docs/contracts/openapi.yaml`
- `../traccar-adapter/test/support/contracts.ts`
- `../traccar-adapter/test/contracts/documents.spec.ts`
- `../telemetry-infra/docs/platform/decisions/0004-user-identity-and-tenant-claims.md`

## Contrato
```ts
# openapi.yaml (extracto)
openapi: 3.1.0
info: { title: core-service, version: 0.1.0 }
security: [ { keycloak: [] } ]
components:
  securitySchemes:
    keycloak: { type: http, scheme: bearer, bearerFormat: JWT, x-audience: core-service, x-tenant-claim: tenant_id,
                description: "Token de usuario de Keycloak (realm telemetry, client web-app). Roles: resource_access.core-service.roles y realm_access.roles (platform-operator)." }
  schemas: { ErrorBody: …, Readiness: … }   # como en traccar-adapter
paths: { /health: { get: { security: [], … } }, /health/ready: { get: { security: [], responses: { '200', '503' } } } }
```

## Archivos a crear/modificar
- [ ] `docs/contracts/openapi.yaml` (nuevo)
- [ ] `test/support/contracts.ts` (nuevo, portado sin AsyncAPI)
- [ ] `test/contracts/documents.spec.ts` (nuevo, solo OpenAPI); `package.json` (devDeps)

## Criterios de aceptación
- [ ] **AC-1** — El documento contiene health, ready, `ErrorBody` y `securitySchemes.keycloak` con `x-audience` y `x-tenant-claim`.
- [ ] **AC-2** — `@readme/openapi-parser` `validate` sin errores; romper el YAML a propósito hace fallar el test.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
