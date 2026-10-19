---
id: 002-T02
status: done          # todo | doing | blocked | done
depends_on: [002-T01]
covers: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6]
---

# 002-T02 — Suite de tests de la imagen

## Objetivo
`pnpm test:image` construye la imagen y verifica AC-1…AC-6 con contenedores reales.

## Contexto (leer SOLO esto)
- `../traccar-adapter/test/image/docker.ts`
- `../traccar-adapter/test/image/container.image-spec.ts`
- `../traccar-adapter/test/image/shutdown-and-volume.image-spec.ts`
- `../traccar-adapter/vitest.config.image.ts`
- `Dockerfile`

## Archivos a crear/modificar
- [x] `vitest.config.image.ts` (nuevo) + script `"test:image": "vitest run --config ./vitest.config.image.ts"`
- [x] `test/image/docker.ts` (nuevo; `IMAGE = "core-service:test"`; sin `streamMessages`)
- [x] `test/image/container.image-spec.ts` (nuevo; incluye el test de `docker stop` → exit 0 < 10 s del original, sin NATS ni volumen)

## Criterios de aceptación
- [x] Un `it('AC-n: …')` por AC-1…AC-6. AC-2 con `PORT=abc` (inválido) → exit ≠ 0 y `invalidVariables` contiene `PORT`. AC-4: `ls -A /app` exacto, sin `*.ts` fuera de `node_modules`, sin `.env*`; `Config.Env` solo `PATH`, `NODE_VERSION`, `YARN_VERSION`, `NODE_ENV`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm test:image
pnpm check
```

## Handoff
- `vitest.config.image.ts` y script `test:image` configurados.
- Helpers de Docker en `test/image/docker.ts` (`IMAGE = 'core-service:test'`).
- Suite en `test/image/container.image-spec.ts` validando AC-1 a AC-6 en verde.
- Listo para T03 (workflow de CI en GitHub Actions).

