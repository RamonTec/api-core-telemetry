---
id: 002-T03
status: done          # todo | doing | blocked | done
depends_on: [002-T02]
covers: [AC-7, AC-8]
---

# 002-T03 — Workflow de CI con check, e2e, image y build arm64

## Objetivo
GitHub Actions ejecuta los tres checks en cada PR y push a `main` y verifica que la imagen compila para arm64.

## Contexto (leer SOLO esto)
- `../traccar-adapter/.github/workflows/ci.yml`
- `../traccar-adapter/README.md`
- `README.md`

## Contrato
```ts
# job image, después de `pnpm test:image`:
- uses: docker/setup-qemu-action@v3
- uses: docker/setup-buildx-action@v3
- run: docker buildx build --platform linux/arm64 -t core-service:arm64-check .
```

## Archivos a crear/modificar
- [x] `.github/workflows/ci.yml` (nuevo; job `e2e` sin NATS: solo `pnpm test:e2e`)
- [x] `README.md` (reescribir el del starter: descripción, comandos, "Imagen de contenedor", "Integración continua")

## Criterios de aceptación
- [x] **AC-8** — YAML válido (`python3 -c "import yaml;yaml.safe_load(open('.github/workflows/ci.yml'))"`), `permissions: contents: read`, `concurrency` con `cancel-in-progress`, jobs `check`, `e2e`, `image`.
- [x] **AC-7** — El job `image` incluye el build `linux/arm64`. Verificación final: los checks del PR en verde.

## Notas
Probar en local el build arm64 si el host tiene QEMU/buildx (`docker buildx build --platform linux/arm64 .`); si no, dejarlo indicado en el Handoff.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
- `.github/workflows/ci.yml` configurado con jobs `check`, `e2e` e `image`.
- Permisos `contents: read`, concurrencia con `cancel-in-progress`, y build de imagen para `linux/arm64` con setup-qemu y setup-buildx.
- Host local sin buildx; compilación arm64 se ejecutará en los runners de GitHub Actions.
- `README.md` reescrito con descripción, variables de entorno, contenedor e integración continua.

