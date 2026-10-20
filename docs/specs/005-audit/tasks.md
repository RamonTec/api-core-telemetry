---
spec: 005
---

# 005 — Tasks

| Task | Título | Depende de | Estado |
|------|--------|-----------|--------|
| T01 | Ports de auditoría, reloj e ids con sus fakes | — | done |
| T02 | Helper runAudited con actor y tenant | T01 | done |
| T03 | Adaptadores (pino, reloj, UUID v7) y AuditModule global | T02 | done |

## Cobertura AC → tasks
| AC | Tasks |
|----|-------|
| AC-1 | T02, T03 |
| AC-2 | T02 |
| AC-3 | T02, T03 |
| AC-4 | T02 |
| AC-5 | T02 |
| AC-6 | T02, T03 |
| AC-7 | T01, T03 |

## Checklist de cierre del spec
- [x] Todos los tasks en `done` con `## Handoff` relleno
- [x] Cada AC del spec tiene al menos un test `it('AC-n: …')` en verde
- [x] `pnpm check` y `pnpm test:e2e` en verde
- [x] Variables de entorno nuevas documentadas (README) y añadidas a `test/support/test-env.ts` (sin variables nuevas)
- [x] `spec.md` → `status: done` y fila del `ROADMAP.md` actualizada
- [ ] PR abierto con la lista de tasks y la matriz AC → tasks
