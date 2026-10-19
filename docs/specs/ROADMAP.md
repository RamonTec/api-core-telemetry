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
| 005-audit | AuditLogPort, ClockPort, IdGeneratorPort, runAudited con `tenantId` | FND-FR9 | 0003 | 003 | draft |
| 006-contract-tooling | `openapi.yaml`, validación de documento, test de rutas y roles, respuestas e2e contra el contrato | FND-FR10 | PADR-001, PADR-004 | 003, 004 | draft |

Orden recomendado: 001 → 002 → 003 → 004 → 005 → 006. 003 y 004 son independientes entre sí; 005 necesita 003 (Actor); 006 necesita 003 y 004.
