---
id: 004-T04
status: todo           # todo | doing | blocked | done
depends_on: [004-T01, 004-T02, 004-T03]
covers: [AC-3, AC-4, AC-5, AC-7]
---

# 004-T04 — PrismaService, DatabaseModule y check de readiness

## Objetivo
Un servicio global expone el cliente base, el cliente de tenant (`forTenant`/`forActor`), `ping()` y cierra conexiones al apagar; registra el check crítico `database`.

## Contexto (leer SOLO esto)
- `docs/specs/004-database/design.md`
- `src/shared/infrastructure/database/tenant-scope.ts`
- `src/shared/infrastructure/health/readiness.registry.ts`
- `src/shared/application/actor.ts`
- `src/app.module.ts`

## Contrato
```ts
@Injectable() export class PrismaService implements OnApplicationShutdown {
  constructor(@Inject(APP_CONFIG) config: AppConfig);          // new PrismaClient({ adapter: new PrismaMariaDb(config.database.url) })
  readonly client: PrismaClient;
  forTenant(tenantId: string): TenantClient;                   // client.$extends({ query: { $allModels: { $allOperations({ model, operation, args, query }) {
                                                                //   return scoped.has(model) ? query(scopeArgs(operation, args, tenantId)) : query(args) } } } })
  forActor(actor: Actor): TenantClient;                        // platform-operator → TenantIsolationError
  ping(): Promise<boolean>;                                    // client.$queryRaw`SELECT 1`; false si lanza
  onApplicationShutdown(): Promise<void>;                      // $disconnect
}
@Global() @Module(...) export class DatabaseModule implements OnApplicationBootstrap   // registry.register('database', () => prisma.ping())
```

## Archivos a crear/modificar
- [ ] `src/shared/infrastructure/database/prisma.service.ts` (nuevo) + spec (forActor con operador; forTenant delega en scopeArgs — sin BD)
- [ ] `src/shared/infrastructure/database/database.module.ts` (nuevo)
- [ ] `src/app.module.ts` (importa `DatabaseModule`)

## Criterios de aceptación
- [ ] **AC-7** — `forActor(operador)` → `TenantIsolationError`.
- [ ] **AC-3/AC-4** — Se verifican por e2e en T05 (BD real).

## Notas
`ping()` nunca debe colgar el readiness: si el driver tarda, limitar con un timeout corto (p.ej. 2 s).

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
