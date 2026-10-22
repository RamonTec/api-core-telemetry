# Roadmap de specs

Cada fila es una carpeta `docs/specs/NNN-slug/`. Las fases y sus requisitos: `docs/product/planning.md` y
`docs/product/phases/`. Solo se listan specs de fases ya planificadas.

## Fase 0 — foundation ([phases/00-foundation.md](../product/phases/00-foundation.md))
| Spec | Alcance | Requisitos | ADRs | Depende de | Estado |
|------|---------|-----------|------|-----------|--------|
| 001-foundation | config, logging, errores, health, apagado | FND-FR1, FND-FR2, FND-NFR4 | 0001, PADR-001 | — | done |
| 002-container-ci | Dockerfile (amd64 + arm64), `.node-version`, CI `check`, `e2e`, `image` | FND-NFR1–NFR3 | — | 001 | done |
| 003-user-auth | JWT de usuario, actor (sub, tenant, roles), `@Public`, `@Roles`, reglas operador/tenant | FND-FR3–FR6 | PADR-004 | 001 | done |
| 004-database | Prisma 7 + MySQL, migraciones, readiness, aislamiento por tenant, MySQL en e2e y CI, migraciones al arrancar | FND-FR7, FND-FR8, FND-NFR5 | 0002 | 001 | done |
| 005-audit | AuditLogPort, ClockPort, IdGeneratorPort, runAudited con `tenantId` | FND-FR9 | 0003 | 003 | done |
| 006-contract-tooling | `openapi.yaml`, validación de documento, test de rutas y roles, respuestas e2e contra el contrato | FND-FR10 | PADR-001, PADR-004 | 003, 004 | done |

Orden recomendado: 001 → 002 → 003 → 004 → 005 → 006. 003 y 004 son independientes entre sí; 005 necesita 003 (Actor); 006 necesita 003 y 004.

## Fase 1 — tenancy ([phases/01-tenancy.md](../product/phases/01-tenancy.md))
| Spec | Alcance | Requisitos | ADRs | Depende de | Estado |
|------|---------|-----------|------|-----------|--------|
| 007-platform-catalogs | Catálogo geográfico de Venezuela, rubros, versiones de términos | TEN-FR15, TEN-FR16 | 0002 | — | pending |
| 008-tenant-model | Tablas y dominio del tenant, vendedores, aislamiento y acceso del operador de plataforma | TEN-FR3, TEN-FR7, TEN-NFR5 | 0002, PADR-004 | 007 | pending |
| 009-outbox | Transacción + outbox, worker con reintentos e idempotencia | TEN-NFR3 | 0002 | — | pending |
| 010-keycloak-admin | `IdentityProviderPort` + adaptador de la Admin API de Keycloak | TEN-FR4 | PADR-002, PADR-005 | 009 | pending |
| 011-traccar-client | Cliente de traccar-adapter: crear group | TEN-FR8 | PADR-002 | 009 | pending |
| 012-sellers | Gestión de vendedores | TEN-FR14 | — | 008 | pending |
| 013-tenant-signup | Autoregistro público, captcha, respuesta uniforme, notificaciones | TEN-FR1, TEN-FR3, TEN-NFR1, TEN-NFR2, TEN-NFR4 | PADR-005 | 007, 008, 010 | pending |
| 014-operator-tenants | Alta asistida, listado y consulta, cambio de vendedor | TEN-FR2, TEN-FR13, TEN-FR17 | — | 012, 013 | pending |
| 015-tenant-activation | `GET /v1/me`, términos en primer login, activación, reenvío, vencimiento | TEN-FR5, TEN-FR6, TEN-FR8 | PADR-005 | 011, 013 | pending |
| 016-read-only-mode | Solo lectura por estado del tenant; suspensión | TEN-FR9, TEN-FR10 | — | 015 | pending |
| 017-closure-reactivation | Cierre, reactivación, `OutstandingBalancePort` | TEN-FR11, TEN-FR12 | PADR-005 | 016 | pending |
| 018-tenant-profile | Datos del tenant por su administrador | TEN-FR18 | — | 015 | pending |

Orden recomendado: 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015 → 016 → 017 → 018. 009–011 pueden adelantarse
(no dependen de 007/008); 018 en cualquier momento después de 015.
