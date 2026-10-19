---
spec: 002
---

# 002 — Tasks

| Task | Título | Depende de | Estado |
|------|--------|-----------|--------|
| T01 | Dockerfile, .dockerignore y script docker:build | — | done |
| T02 | Suite de tests de la imagen | T01 | todo |
| T03 | Workflow de CI con check, e2e, image y build arm64 | T02 | todo |

## Cobertura AC → tasks
| AC | Tasks |
|----|-------|
| AC-1 | T01, T02 |
| AC-2 | T02 |
| AC-3 | T01, T02 |
| AC-4 | T01, T02 |
| AC-5 | T01, T02 |
| AC-6 | T02 |
| AC-7 | T03 |
| AC-8 | T03 |

## Checklist de cierre del spec
- [ ] Todos los tasks en `done` con `## Handoff` relleno
- [ ] Cada AC del spec tiene al menos un test `it('AC-n: …')` en verde
- [ ] `pnpm check` y `pnpm test:e2e` en verde
- [ ] Variables de entorno nuevas documentadas (README) y añadidas a `test/support/test-env.ts`
- [ ] `spec.md` → `status: done` y fila del `ROADMAP.md` actualizada
- [ ] PR abierto con la lista de tasks y la matriz AC → tasks
