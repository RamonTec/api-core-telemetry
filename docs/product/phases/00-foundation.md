# Fase 0 — foundation

- Estado: **diseñada** (2026-10-16): specs 001–006 con design y tasks en `docs/specs/`.
- Mapa: [../planning.md](../planning.md). Reglas comunes: allí; no se repiten aquí.
- Objetivo de la fase: **core-service vacío pero listo para construir negocio**. Arranca, se despliega igual que
  traccar-adapter, autentica usuarios, sabe quién es el actor y su tenant, tiene BD con migraciones y un mecanismo de
  aislamiento por tenant, y audita. Sin ninguna entidad de negocio todavía (llegan en la fase 1).

## Punto de partida
- El repo es el starter de NestJS 12 (ESM, Vitest, oxlint, prettier), sin commits.
- traccar-adapter ya resolvió casi todo lo transversal: se **portan** sus piezas (mismo stack y convenciones) en vez de
  rediseñarlas. Referencias: traccar-adapter specs 001 (foundation), 002 (service-auth), 012 (audit), 014 (imagen),
  015 (CI) y 016 (contratos).

## Requisitos
### Funcionales
| ID | Requisito |
|----|-----------|
| FND-FR1 | Configuración por variables de entorno validada al arrancar; inválida → el proceso termina nombrando las variables (nunca sus valores). |
| FND-FR2 | Logs JSON con correlación, log de cada request, `ErrorBody` y `GET /health` según PADR-001; apagado ordenado con `SIGTERM`. |
| FND-FR3 | Toda ruta exige un **token de usuario de Keycloak** válido (firma, `iss`, `aud`, expiración), salvo las marcadas como públicas (`/health*`). |
| FND-FR4 | Cada petición autenticada tiene un **contexto de actor**: id del usuario, tenant (o ninguno si es operador de la plataforma) y roles. Los casos de uso lo reciben explícitamente. |
| FND-FR5 | Autorización declarativa por rol en cada ruta (`administrador`, `operador`, `solo lectura`, `conductor`, `operador de plataforma`); sin el rol → `403`. |
| FND-FR6 | Una ruta de tenant invocada por un usuario sin tenant (o una de plataforma por un usuario de tenant) → `403`. |
| FND-FR7 | MySQL (esquema `core`) con Prisma: migraciones schema-first versionadas, aplicadas con `migrate deploy`; `GET /health/ready` comprueba la BD. |
| FND-FR8 | Mecanismo de **aislamiento por tenant** listo para usar: un repositorio de un modelo con `tenant_id` no puede leer ni escribir fuera del tenant del actor, aunque el caso de uso lo olvide. |
| FND-FR9 | **Auditoría** de operaciones de escritura vía port (`AuditLogPort`, helper `runAudited`), como traccar-adapter ADR-0006, añadiendo `tenantId` a cada línea. |
| FND-FR10 | Contrato **OpenAPI** publicado en `docs/contracts/openapi.yaml` y verificado por tests (rutas y respuestas), como traccar-adapter 016. |

### No funcionales
| ID | Requisito |
|----|-----------|
| FND-NFR1 | `pnpm check` (typecheck, lint, formato, tests unitarios) es la Definition of Done; las dependencias hexagonales las fuerza el lint. |
| FND-NFR2 | Imagen Docker reproducible, no-root, healthcheck en `/health`, misma imagen para todos los entornos (como traccar-adapter 014), con **arm64** para la VM de Oracle. |
| FND-NFR3 | CI en GitHub Actions con checks separados: `check`, `e2e` (MySQL efímero) e `image` (como traccar-adapter 015). |
| FND-NFR4 | Tokens, cabeceras de autorización y datos personales nunca en logs. |
| FND-NFR5 | El aislamiento por tenant (FND-FR8) tiene tests que fallan si una consulta puede cruzar de tenant. |

## Decisiones de la fase
| Tema | Decisión | Estado |
|------|----------|--------|
| Validar el JWT en core-service | **Sí**: core-service valida el JWT que reenvía api-gateway (mismo Keycloak). Defensa en profundidad. | Aceptada (PADR-004 §5) |
| Tenant en el token | Claim **`tenant_id`** (atributo del usuario, editable solo por admins + mapper). El operador de plataforma no lo tiene. | Aceptada (PADR-004 §2) |
| Roles en el token | Client roles de `core-service` (`tenant-admin`, `tenant-operator`, `tenant-viewer`, `driver`) + rol de realm `platform-operator`. | Aceptada (PADR-004 §3) |
| Client del frontend | Client público `web-app` (Authorization Code + PKCE) con audience mapper → `core-service`. | Aceptada (PADR-004 §1; ya en el realm de telemetry-infra) |
| Ids de entidades | **UUID v7** (ordenables por tiempo) generados en la aplicación, `CHAR(36)` en MySQL. | Aceptada (coding.md) |
| Aislamiento | Extensión de Prisma Client que añade/valida `tenantId` en toda operación de modelos con tenant + tests unitarios; tests de integración por repositorio desde la fase 1. | Aceptada (ADR-0002; verificada con Prisma 7.10.1 + MySQL 8.4) |
| BD de tests | MySQL 8.4 en contenedor para e2e (local: `pnpm test:infra:up`; CI: servicio del job). | Aceptada (spec 004) |
| Usuarios S2S (otros servicios → core-service) | Fuera de la fase 0; llega con la fase 5 (telemetry-mapping). | Diferido |

## Specs de la fase
| Spec | Alcance | Requisitos | Base en traccar-adapter |
|------|---------|-----------|-------------------------|
| 001-foundation | Config, logging, errores, health, apagado | FND-FR1, FND-FR2, FND-NFR4 | 001 |
| 002-container-ci | Dockerfile (amd64 + arm64), `.node-version`, CI con `check`, `e2e`, `image` | FND-NFR1–3 | 014, 015 |
| 003-user-auth | Validación del JWT de usuario, contexto de actor, roles, rutas públicas, operador vs tenant | FND-FR3–FR6 | 002 (adaptado a usuarios) |
| 004-database | MySQL en `telemetry-infra` y en tests, Prisma, migraciones, readiness, extensión de aislamiento | FND-FR7, FND-FR8, FND-NFR5 | — (nuevo) |
| 005-audit | `AuditLogPort`, `ClockPort`, `runAudited`, adapter pino, con `tenantId` | FND-FR9 | 012 |
| 006-contract-tooling | `openapi.yaml` inicial (health), validación de documento, rutas y roles, respuestas en e2e | FND-FR10 | 016 |

Orden: 001 → 002 → 003 → 004 → 005 → 006 (003 y 004 son independientes entre sí).

## Preguntas abiertas
_Ninguna._ Q1 (tenant y roles en Keycloak) resuelta en PADR-004 (2026-10-16).

## Fuera de la fase
Cualquier entidad de negocio (tenants, vehículos…), el cliente HTTP de traccar-adapter (fase 1), la creación de
usuarios en Keycloak (fase 3), llamadas S2S entrantes (fase 5), el modo solo lectura (fase 4).
