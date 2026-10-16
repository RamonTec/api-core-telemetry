---
spec: 006-contract-tooling
status: draft          # draft | approved
---

# 006 — Diseño

Base: traccar-adapter 016 (`../traccar-adapter/test/support/{contracts,http-contract}.ts`,
`../traccar-adapter/test/contracts/{documents,routes}.spec.ts`, `../traccar-adapter/docs/contracts/`). Sin AsyncAPI.

## Componentes
| Archivo | N/M | Responsabilidad |
|---------|-----|-----------------|
| `docs/contracts/openapi.yaml` | N | OpenAPI 3.1, `info.version: 0.1.0`; `securitySchemes.keycloak` (bearer JWT, `x-audience: core-service`, `x-tenant-claim: tenant_id`); `security: [keycloak: []]` global; health con `security: []` |
| `docs/contracts/README.md` | N | Guía: añadir endpoints, `x-required-roles`, `x-retryable`, versiones |
| `package.json` | M | devDeps `yaml`, `ajv`, `ajv-formats`, `@readme/openapi-parser` (versiones de traccar-adapter) |
| `test/support/contracts.ts` | N | `loadDocument`, `validateAgainst` (Ajv 2020) — portado, solo OpenAPI |
| `test/contracts/documents.spec.ts` | N | AC-2 |
| `test/contracts/routes.spec.ts` | N | AC-3, AC-4 (metadata de Nest + `DiscoveryService`; `x-required-roles` = roles del `@Roles` de la ruta) |
| `test/support/http-contract.ts` | N | `recordResponses(app)`, `checkHttpContract(responses)` — portado |
| `test/{app,user-auth,database}.e2e-spec.ts` | M | Instalan el registro y comprueban el contrato en `afterEach` |
| `README.md` | M | Enlace a `docs/contracts/` |

## Contratos internos
```ts
export const OPENAPI_PATH = 'docs/contracts/openapi.yaml';
export function loadDocument(path: string): Record<string, unknown>;
export function validateAgainst(docPath: string, pointer: string, value: unknown): ContractViolation | null;
export function recordResponses(app: INestApplication): { take(): RecordedResponse[] };   // antes de app.init()
export function checkHttpContract(responses: readonly RecordedResponse[]): ContractViolation[];
// routes.spec: exposedRoutes() con Test.createTestingModule({ imports: [AppModule.register(testConfig()), DiscoveryModule] }).compile()
//   (sin init: no conecta a la BD); cada ruta "METHOD /path" (`:p` → `{p}`) debe estar en paths y viceversa;
//   si la ruta tiene @Roles(...), el documento debe tener x-required-roles con los mismos roles; si es @Public, security: [].
```

## Decisiones
- `x-required-roles` (lista) en lugar del `x-required-role` de traccar-adapter: aquí una ruta admite varios roles.
- Versión `0.1.0` hasta el primer endpoint de negocio; desde la fase 1 se sigue semver.
