---
id: 004-T03
status: todo           # todo | doing | blocked | done
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
- [ ] `src/shared/infrastructure/database/tenant-scope.ts` (nuevo) + spec

## Criterios de aceptación
- [ ] **AC-5** — Una tabla de casos (`it.each`) por operación: `where` y `data` resultantes.
- [ ] **AC-6** — `create` con otro `tenantId` → `TenantIsolationError`; operación desconocida → `TenantIsolationError`; la entrada no se muta.
- [ ] `tenantScopedModels` con un namespace falso devuelve solo los modelos con `tenantId`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
