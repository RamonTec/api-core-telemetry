# ADR-0002 — Persistencia con Prisma: schema-first con SQL revisado y aislamiento por tenant

- Estado: aceptado
- Fecha: 2026-10-16
- Origen: decisión de plataforma (architecture.md §12, "Migraciones (Prisma)"); aplica también a telemetry-service.

## Contexto
core-service guarda su modelo de negocio en MySQL (esquema `core`), multitenant con `tenant_id` en tablas compartidas.
Hace falta una forma de evolucionar el esquema revisable en PR y una garantía de aislamiento que no dependa de que cada
caso de uso recuerde filtrar.

## Decisión
1. **Prisma** como ORM y herramienta de migraciones. `prisma/schema.prisma` es la **fuente de verdad**.
2. Cada cambio: editar el schema → `prisma migrate dev --create-only --name <cambio>` → **revisar/editar el SQL**
   (CHECK, índices especiales, particiones, vistas) → aplicar → commitear schema + migración juntos. En CI y despliegue,
   `prisma migrate deploy`. Prohibido `db push` fuera de experimentos locales.
3. **DB-first descartado**: `db pull` sobrescribe ajustes del schema y exigiría otra herramienta de migraciones.
4. **Hexagonal**: el cliente Prisma solo en `infrastructure`; los repositorios devuelven entidades de dominio.
5. **Aislamiento por tenant**: los modelos con `tenantId` se acceden con un cliente extendido (`$extends`) que, dado el
   tenant del actor, **añade** `tenantId` a todo `where`/`data` y **rechaza** operaciones que intenten otro tenant. Se
   prueba con tests unitarios de la extensión y tests de integración por repositorio (`docs/standards/testing.md`).
6. Convenciones: tablas y columnas en `snake_case` (`@@map`/`@map`), modelos en `PascalCase`; ids UUID v7 `CHAR(36)`;
   `created_at`/`updated_at` `TIMESTAMP(3)` UTC.

## Consecuencias
- (+) Un solo origen del esquema, migraciones SQL legibles en cada PR.
- (+) El aislamiento es por construcción, no por disciplina.
- (−) Lo que Prisma no expresa (particiones, CHECK) se mantiene a mano en el SQL de la migración.
- (−) La extensión de aislamiento no cubre `$queryRaw`: SQL crudo prohibido en repositorios de modelos con tenant salvo
  revisión explícita.
