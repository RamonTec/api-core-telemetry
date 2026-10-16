---
spec: 001
---

# 001 — Tasks

| Task | Título | Depende de | Estado |
|------|--------|-----------|--------|
| T01 | Errores de dominio y tabla código ↔ status | — | todo |
| T02 | Configuración por entorno validada con zod | — | todo |
| T03 | Logging estructurado con correlation id (nestjs-pino) | T02 | todo |
| T04 | Exception filter global y pipe de validación zod | T01, T03 | todo |
| T05 | GET /health y GET /health/ready con registro de checks | — | todo |
| T06 | AppModule, bootstrap y retirada del starter | T02, T03, T04, T05 | todo |
| T07 | Suite e2e de la foundation | T06 | todo |

Paralelizables: T01, T02, T05.

## Cobertura AC → tasks
| AC | Tasks |
|----|-------|
| AC-1 | T02, T06, T07 |
| AC-2 | T02, T06, T07 |
| AC-3 | T03, T07 |
| AC-4 | T03, T07 |
| AC-5 | T03, T07 |
| AC-6 | T03, T07 |
| AC-7 | T02, T03 |
| AC-8 | T01, T04 |
| AC-9 | T04, T07 |
| AC-10 | T04, T07 |
| AC-11 | T04 |
| AC-12 | T05, T07 |
| AC-13 | T05, T07 |
| AC-14 | T06, T07 |
| AC-15 | T06, T07 |

## Checklist de cierre del spec
- [ ] Todos los tasks en `done` con `## Handoff` relleno
- [ ] Cada AC del spec tiene al menos un test `it('AC-n: …')` en verde
- [ ] `pnpm check` y `pnpm test:e2e` en verde
- [ ] Variables de entorno nuevas documentadas (README) y añadidas a `test/support/test-env.ts`
- [ ] `spec.md` → `status: done` y fila del `ROADMAP.md` actualizada
- [ ] PR abierto con la lista de tasks y la matriz AC → tasks
