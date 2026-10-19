---
spec: 003
---

# 003 — Tasks

| Task | Título | Depende de | Estado |
|------|--------|-----------|--------|
| T01 | Tipos de actor y reglas de PADR-004 (claims → actor) | — | done |
| T02 | Configuración de Keycloak | — | done |
| T03 | Verificador de JWT de usuario (jose) | T01, T02 | done |
| T04 | Guard global, decoradores y wiring | T03 | done |
| T05 | Actor y tenant en el log de request | T04 | done |
| T06 | E2E de autenticación con tokens firmados | T05 | done |

Paralelizables: T01, T02.

## Cobertura AC → tasks
| AC | Tasks |
|----|-------|
| AC-1 | T04, T06 |
| AC-2 | T03, T04, T06 |
| AC-3 | T03, T04, T06 |
| AC-4 | T01, T06 |
| AC-5 | T01, T06 |
| AC-6 | T01, T04, T06 |
| AC-7 | T04, T06 |
| AC-8 | T04, T06 |
| AC-9 | T04, T06 |
| AC-10 | T05, T06 |
| AC-11 | T02 |

## Checklist de cierre del spec
- [x] Todos los tasks en `done` con `## Handoff` relleno
- [x] Cada AC del spec tiene al menos un test `it('AC-n: …')` en verde
- [x] `pnpm check` y `pnpm test:e2e` en verde
- [x] Variables de entorno nuevas documentadas (README) y añadidas a `test/support/test-env.ts`
- [x] `spec.md` → `status: done` y fila del `ROADMAP.md` actualizada
- [ ] PR abierto con la lista de tasks y la matriz AC → tasks
