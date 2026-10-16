---
id: 004-database
status: draft          # draft | approved | in-progress | done
requirements: [FND-FR7, FND-FR8, FND-NFR5]
adrs: [0002]
---

# 004 — Base de datos: MySQL, Prisma, migraciones y aislamiento por tenant

## Problema
Todos los módulos de negocio guardan datos en MySQL (esquema `core`) y comparten tablas entre tenants (`tenant_id`).
Antes de la primera entidad hace falta: conexión y migraciones con Prisma 7 según ADR-0002, comprobación en readiness,
infraestructura de BD para tests y CI, y un mecanismo que impida por construcción que una operación cruce de tenant.

## Alcance
- Incluye: dependencias y configuración de Prisma 7 con MySQL (driver adapter), `DATABASE_URL`, cliente generado,
  scripts de migración, servicio de BD con apagado ordenado, check `database` en `/health/ready`, cliente con
  **aislamiento por tenant**, MySQL para e2e (local y CI), migraciones al arrancar el contenedor.
- **No incluye**: ninguna tabla de negocio (la primera llega en la fase 1), repositorios concretos, seeds, réplicas de
  lectura, servicio `core-service` en telemetry-infra.

## Comportamiento (criterios de aceptación)
- **AC-1** — `DATABASE_URL` (`mysql://…`) DEBE ser obligatoria y validarse al arrancar; inválida → el proceso termina
  nombrándola, sin mostrar su valor.
- **AC-2** — El esquema DEBE vivir en `prisma/schema.prisma`, las migraciones en `prisma/migrations/`, y existir scripts
  para generar el cliente, crear una migración sin aplicarla (`--create-only`) y aplicar las pendientes (`deploy`). El
  cliente generado NO DEBE commitearse.
- **AC-3** — CUANDO la BD responde, `GET /health/ready` DEBE incluir `database: "ok"`; SI no responde, ENTONCES `503`
  con `database: "error"` (check crítico). El servicio DEBE arrancar aunque la BD no esté disponible.
- **AC-4** — CUANDO el proceso se apaga, DEBE cerrar las conexiones a la BD.
- **AC-5** — El cliente para un tenant DEBE añadir `tenantId` a toda lectura, actualización y borrado de modelos con
  `tenantId`, y fijarlo en toda creación; los modelos sin `tenantId` NO DEBEN alterarse.
- **AC-6** — SI una operación con tenant intenta escribir un `tenantId` distinto del del cliente, ENTONCES DEBE fallar
  con un error de aislamiento (500, log `error`) sin tocar la BD.
- **AC-7** — Obtener el cliente de tenant para un actor `platform-operator` DEBE fallar: el operador debe indicar
  explícitamente el tenant objetivo.
- **AC-8** — `pnpm test:e2e` DEBE ejecutarse contra un MySQL real (contenedor local o servicio de CI) con las
  migraciones aplicadas antes de las suites.
- **AC-9** — La imagen DEBE aplicar las migraciones pendientes al arrancar (desactivable con `RUN_MIGRATIONS=false`)
  y seguir cumpliendo los criterios de 002 (no-root, contenido mínimo, healthcheck, apagado).

## Contratos externos
- MySQL 8.4, base `core` (telemetry-infra: usuario `core_service`; base `core_shadow` para `migrate dev`).
- Variables: `DATABASE_URL` (obligatoria), `SHADOW_DATABASE_URL` (solo desarrollo, para `migrate dev`),
  `RUN_MIGRATIONS` (imagen, def. `true`).

## Preguntas abiertas
_Ninguna._ Viabilidad verificada con Prisma 7.10.1 + MySQL 8.4 (2026-10-16): ver design.
