# core-service

Núcleo de negocio de la plataforma: tenants, usuarios, flota (vehículos, GPS, conductores), facturación y verticales
(viajes, órdenes). Único servicio con el mapeo negocio ↔ Traccar. MySQL (esquema `core`) con Prisma.
Stack: NestJS 12 (ESM, imports relativos con `.js`), TypeScript strict, Vitest, oxlint, prettier, pnpm, Prisma.

## Reglas duras (no negociables)

1. **Aislamiento por tenant**: ninguna operación lee o escribe datos de otro tenant. El tenant sale del token, nunca del
   cliente HTTP. Todo repositorio de un modelo con `tenantId` tiene test de aislamiento.
2. **Nunca** mover un GPS a otro tenant; un IMEI reutilizado es un registro nuevo. **Nunca** borrado físico de
   entidades con historial.
3. Dependencias hexagonales: `domain` ← `application` ← `infrastructure`; Prisma y NestJS solo en `infrastructure`.
   Lint las hace cumplir.
4. Cada cambio de esquema = `schema.prisma` + migración SQL revisada en el **mismo commit** (ADR-0002).
5. Sin código que no salga de un task aprobado. Sin spec aprobado no hay task.

## Flujo SDD (resumen) → detalle en `docs/sdd/WORKFLOW.md`

`/sdd-spec` → aprobación → `/sdd-plan` → aprobación → `/sdd-tasks` → `/sdd-impl <spec>-<task>` (1 task = 1 sesión = 1
commit). `/sdd-status` para ver el siguiente task.

## Presupuesto de contexto

- En una sesión de implementación lee **solo** el archivo del task y los archivos listados en su sección `Contexto`
  (pueden incluir archivos de `../traccar-adapter/` como referencia para portar).
- No leas `docs/product/` completo; los specs citan los IDs (`FND-FR3`, `TEN-FR1`…) que necesitas.
- Si te falta contexto, **para** y reporta qué falta; no explores el repo a ciegas.
- Estándares: carga solo el que aplique (`docs/standards/{architecture,coding,testing,git}.md`).
- Decisiones de plataforma (PADR): `../telemetry-infra/docs/platform/decisions/`.

## Comandos de proyecto

- `pnpm check` — sync SDD + typecheck + lint + format:check + test (Definition of Done)
- `pnpm test` / `pnpm test:e2e` / `pnpm lint` / `pnpm format`

## Multi-agente (Claude Code + Antigravity)

- Este archivo (`AGENTS.md`) es la **única** fuente de reglas. `CLAUDE.md` solo lo importa.
- Comandos SDD: fuente en `docs/sdd/commands/` → copias en `.claude/commands/` y `.agents/workflows/`.
- Skills: fuente en `docs/sdd/skills/<nombre>/SKILL.md` → copias en `.claude/skills/` y `.agents/skills/`.
- Las copias se generan con `pnpm sdd:sync`. **Nunca** edites las copias.
- Los artefactos propios del agente no sustituyen a `docs/specs/**`. El estado oficial vive solo ahí.
- Un task por conversación nueva. No trabajes en paralelo sobre el mismo spec desde dos agentes.
