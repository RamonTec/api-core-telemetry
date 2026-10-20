---
spec: 006
---

# 006 — Tasks

| Task | Título | Depende de | Estado |
|------|--------|-----------|--------|
| T01 | openapi.yaml inicial, cargador y test de validez | — | done |
| T02 | Test de rutas y roles código ↔ contrato | T01 | done |
| T03 | Validar respuestas e2e contra el contrato | T01 | todo |
| T04 | Guía de contratos y enlace en README | T02, T03 | todo |

## Cobertura AC → tasks
| AC | Tasks |
|----|-------|
| AC-1 | T01 |
| AC-2 | T01 |
| AC-3 | T02 |
| AC-4 | T02 |
| AC-5 | T03 |
| AC-6 | T04 |

## Checklist de cierre del spec
- [ ] Todos los tasks en `done` con `## Handoff` relleno
- [ ] Cada AC del spec tiene al menos un test `it('AC-n: …')` en verde
- [ ] `pnpm check` y `pnpm test:e2e` en verde
- [ ] Variables de entorno nuevas documentadas (README) y añadidas a `test/support/test-env.ts`
- [ ] `spec.md` → `status: done` y fila del `ROADMAP.md` actualizada
- [ ] PR abierto con la lista de tasks y la matriz AC → tasks
