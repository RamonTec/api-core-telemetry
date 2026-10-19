---
id: 004-T03
status: done          # todo | doing | blocked | done
depends_on: []
covers: [AC-5, AC-6]
---

# 004-T03 — Función de aislamiento por tenant (pura)

## Objetivo
`scopeArgs(operation, args, tenantId)` añade o valida `tenantId` según la operación y falla cerrado ante lo desconocido.

## Contexto (leer SOLO esto)
- `docs/specs/004-database/design.md`
- `docs/standards/testing.md`

## Contrato
```ts
export class TenantIsolationError extends Error {}
export function scopeArgs(operation: string, args: unknown, tenantId: string): unknown;
// where-ops: findUnique, findUniqueOrThrow, findFirst, findFirstOrThrow, findMany, count, aggregate, groupBy,
//            update, updateMany, delete, deleteMany, upsert → where = { ...where, tenantId }
// data-ops:  create, update, updateMany → data = { ...data, tenantId }; createMany, createManyAndReturn → cada item;
//            upsert → create y update. data.tenantId presente y distinto → TenantIsolationError.
// cualquier otra operación → TenantIsolationError (fail closed). No muta el objeto recibido.
export function tenantScopedModels(prismaNamespace: { ModelName: Record<string, string> } & Record<string, unknown>): ReadonlySet<string>;
// = Object.values(ModelName).filter(m => 'tenantId' in (ns[`${m}ScalarFieldEnum`] ?? {}))
```

## Archivos a crear/modificar
- [x] `src/shared/infrastructure/database/tenant-scope.ts` (nuevo) + spec

## Criterios de aceptación
- [x] **AC-5** — Una tabla de casos (`it.each`) por operación: `where` y `data` resultantes.
- [x] **AC-6** — `create` con otro `tenantId` → `TenantIsolationError`; operación desconocida → `TenantIsolationError`; la entrada no se muta.
- [x] `tenantScopedModels` con un namespace falso devuelve solo los modelos con `tenantId`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
- Implementada clase TenantIsolationError (hereda de Error).
- Implementada función pura scopeArgs soportando 16 operaciones de Prisma y fallando cerrado.
- Validada inmutabilidad de argumentos de entrada y rechazo de tenantId dispar en data/create/update.
- Implementada función tenantScopedModels filtrando modelos por tenantId en su ScalarFieldEnum.
