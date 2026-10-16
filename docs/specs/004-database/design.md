---
spec: 004-database
status: draft          # draft | approved
---

# 004 — Diseño

## Lo verificado en la prueba de Prisma 7.10.1 + MySQL 8.4 (2026-10-16)
- `prisma-client` generator (ESM) con `output`; la URL va en **`prisma.config.ts`** (`defineConfig`), no en el schema.
- Conexión con driver adapter: `new PrismaClient({ adapter: new PrismaMariaDb(DATABASE_URL) })` (`@prisma/adapter-mariadb`).
- `migrate dev --create-only` genera SQL correcto (`CHAR(36)`, `TIMESTAMP(3)`, índices, `utf8mb4_unicode_ci`).
- `Prisma.dmmf` **no existe** en v7: los modelos con tenant se detectan con
  `Object.values(Prisma.ModelName).filter(m => 'tenantId' in Prisma[`${m}ScalarFieldEnum`])`.
- Extensión `$extends({ query: { $allModels: { $allOperations } } })`: `findUnique` admite `tenantId` extra en `where`
  (devuelve `null` en otro tenant); `update` por id de otro tenant → `P2025`; `deleteMany` de otro tenant → `count 0`.
- **Trampas**: `prisma init` instala skills en `.claude/`, `.agents/` y `.windsurf/` (rompe `pnpm sdd:sync --check`):
  **no usarlo**, crear los archivos a mano. pnpm 11 exige `allowBuilds` para `prisma` y `@prisma/engines`. El schema
  engine necesita **OpenSSL** en la imagen (`apk add --no-cache openssl`).

## Componentes
| Capa | Archivo | N/M | Responsabilidad |
|------|---------|-----|-----------------|
| raíz | `package.json`, `pnpm-workspace.yaml` | M/N | `prisma`, `@prisma/client`, `@prisma/adapter-mariadb` (7.10.x); `allowBuilds`; scripts `db:*` |
| raíz | `prisma.config.ts` | N | `schema`, `migrations.path`, `datasource.url` / `shadowDatabaseUrl` desde env |
| raíz | `prisma/schema.prisma` | N | `generator client { provider = "prisma-client", output = "../src/shared/infrastructure/database/generated", importFileExtension = "js", moduleFormat = "esm" }` (verificado: compila con `tsc` `nodenext`), `datasource db { provider = "mysql" }` |
| raíz | `.gitignore`, `.oxlintrc.json`, `.prettierignore` | M | Ignorar `src/shared/infrastructure/database/generated/` |
| shared/infra | `src/shared/infrastructure/config/app-config.ts` | M | `database: { url }` |
| shared/infra | `src/shared/infrastructure/database/tenant-scope.ts` | N | Función pura: transforma `args` por operación; `TenantIsolationError` |
| shared/infra | `src/shared/infrastructure/database/prisma.service.ts` | N | Cliente base, `forTenant(tenantId)`, `forActor(actor)`, `ping()`, `$disconnect` en shutdown |
| shared/infra | `src/shared/infrastructure/database/database.module.ts` | N | `@Global`; registra el check `database` (crítico) |
| raíz | `src/app.module.ts` | M | Importa `DatabaseModule` |
| test | `test/support/test-env.ts`, `vitest.config.e2e.ts`, `test/support/global-setup.ts` | M/N | `DATABASE_URL` de test; `globalSetup` aplica `prisma migrate deploy` |
| test | `test/database.e2e-spec.ts` | N | Readiness con BD real y con BD caída |
| CI | `.github/workflows/ci.yml` | M | Job `e2e` con servicio `mysql:8.4` |
| imagen | `Dockerfile`, `docker-entrypoint.sh`, `test/image/*` | M/N | `prisma generate` en build; runtime con OpenSSL, `prisma/`, `prisma.config.ts`, CLI `prisma`; entrypoint con migraciones |

## Contratos internos
```ts
// config
export interface DatabaseConfig { readonly url: string }            // AppConfig += database; DATABASE_URL ^mysql://

// tenant-scope.ts (pura, sin Prisma en tiempo de ejecución)
export class TenantIsolationError extends Error {}                  // no DomainError → 500 + log error
export function scopeArgs(operation: string, args: unknown, tenantId: string): unknown;
// where-ops: findUnique(OrThrow), findFirst(OrThrow), findMany, count, aggregate, groupBy, update, updateMany,
//            delete, deleteMany, upsert → where = { ...where, tenantId }
// data-ops:  create, update, updateMany → data.tenantId fijado; createMany(AndReturn) → cada item; upsert → create y update
// data con tenantId distinto → TenantIsolationError. Operación desconocida → TenantIsolationError (fail closed).
export function tenantScopedModels(prismaNamespace: unknown): ReadonlySet<string>;   // ModelName + ScalarFieldEnum

// prisma.service.ts
@Injectable() export class PrismaService implements OnApplicationShutdown {
  constructor(@Inject(APP_CONFIG) config: AppConfig);
  readonly client: PrismaClient;                                    // sin aislamiento: solo modelos sin tenant / migraciones
  forTenant(tenantId: string): TenantClient;                        // $extends con scopeArgs
  forActor(actor: Actor): TenantClient;                             // operador → TenantIsolationError
  ping(): Promise<boolean>;                                         // SELECT 1, false si falla
}
export type TenantClient = ReturnType<PrismaService['forTenant']>;
```

## Flujo
- Scripts: `db:generate` (`prisma generate`), `db:migrate:new` (`prisma migrate dev --create-only --name`),
  `db:migrate:dev` (`prisma migrate dev`), `db:migrate:deploy` (`prisma migrate deploy`); `build` ejecuta antes
  `prisma generate`; `postinstall` también (para que `typecheck` y tests tengan el cliente).
- E2E: `pnpm test:infra:up` → `docker run -d --rm --name core-service-test-mysql -e MYSQL_ROOT_PASSWORD=test -e
  MYSQL_DATABASE=core_test -p 3307:3306 mysql:8.4`; `TEST_ENV.DATABASE_URL = mysql://root:test@127.0.0.1:3307/core_test`
  (sobrescribible con `DATABASE_TEST_URL`); `globalSetup` ejecuta `prisma migrate deploy` contra esa URL.
- Imagen: `docker-entrypoint.sh` → si `RUN_MIGRATIONS` ≠ `false`, `prisma migrate deploy`; luego `exec node
  dist/main.js` (`SIGTERM` debe seguir llegando a Node).

## Decisiones
- Migraciones al arrancar el contenedor: una sola VM; `migrate deploy` usa un lock en la BD, seguro con varias réplicas.
- Sin tabla de prueba: el aislamiento se prueba como función pura aquí; el primer repositorio con tenant (fase 1/2)
  añade el test de integración obligatorio (`docs/standards/testing.md`).
- `TenantIsolationError` no es `DomainError`: indica un bug, debe ser 500 y alertar.
