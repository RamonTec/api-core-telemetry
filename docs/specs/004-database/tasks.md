---
spec: 004
---

# 004 — Tasks

| Task | Título | Depende de | Estado |
|------|--------|-----------|--------|
| T01 | Prisma 7: dependencias, config, schema vacío y scripts | — | done |
| T02 | DATABASE_URL en la configuración | — | done |
| T03 | Función de aislamiento por tenant (pura) | — | done |
| T04 | PrismaService, DatabaseModule y check de readiness | T01, T02, T03 | todo |
| T05 | MySQL para e2e (local y CI) y e2e de readiness | T04 | todo |
| T06 | Imagen con Prisma: generate en build y migraciones al arrancar | T05 | todo |

Paralelizables: T01, T02, T03.

## Cobertura AC → tasks
| AC | Tasks |
|----|-------|
| AC-1 | T02 |
| AC-2 | T01 |
| AC-3 | T04, T05 |
| AC-4 | T04, T05 |
| AC-5 | T03, T04 |
| AC-6 | T03 |
| AC-7 | T04 |
| AC-8 | T05 |
| AC-9 | T06 |

## Checklist de cierre del spec
- [ ] Todos los tasks en `done` con `## Handoff` relleno
- [ ] Cada AC del spec tiene al menos un test `it('AC-n: …')` en verde
- [ ] `pnpm check` y `pnpm test:e2e` en verde
- [ ] Variables de entorno nuevas documentadas (README) y añadidas a `test/support/test-env.ts`
- [ ] `spec.md` → `status: done` y fila del `ROADMAP.md` actualizada
- [ ] PR abierto con la lista de tasks y la matriz AC → tasks
