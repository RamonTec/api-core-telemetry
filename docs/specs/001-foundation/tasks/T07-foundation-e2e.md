---
id: 001-T07
status: todo           # todo | doing | blocked | done
depends_on: [001-T06]
covers: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-9, AC-10, AC-12, AC-13, AC-14, AC-15]
---

# 001-T07 — Suite e2e de la foundation

## Objetivo
`test/app.e2e-spec.ts` verifica la foundation in-process (supertest) y como proceso real (`dist/main.js`).

## Contexto (leer SOLO esto)
- `../traccar-adapter/test/app.e2e-spec.ts`
- `../traccar-adapter/vitest.config.e2e.ts`
- `test/support/log-capture.ts`
- `test/support/test-env.ts`
- `src/app.module.ts`

## Archivos a crear/modificar
- [ ] `test/app.e2e-spec.ts` (reescrito)
- [ ] `vitest.config.e2e.ts` (como el de traccar-adapter, sin `fileParallelism:false` por ahora)

## Criterios de aceptación
- [ ] Un `it('AC-n: …')` por cada AC cubierto: correlation id, log de request, redacción de headers, 404, 500 (ruta de prueba que lanza), `/health`, `/health/ready`, arranque con `PORT`, env inválido, `SIGTERM`, `GET /` 404.

## Notas
Portar las secciones "In-process" y "Real process" del original; quitar las de auth y Traccar. Para AC-9, registrar un controller de prueba solo en el test.

## Fuera de alcance
- —

## Verificación
```bash
pnpm test:e2e
pnpm check
```

## Handoff
