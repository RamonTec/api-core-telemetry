---
id: 002-container-ci
status: in-progress    # draft | approved | in-progress | done
requirements: [FND-NFR1, FND-NFR2, FND-NFR3]
adrs: []
---

# 002 — Imagen de contenedor y CI

## Problema
Para desplegar core-service junto al resto (telemetry-infra) y en la VM ARM de Oracle hace falta una imagen
reproducible, y para delegar el desarrollo a varios agentes hace falta que GitHub verifique la Definition of Done en
cada PR. traccar-adapter ya lo resolvió (specs 014 y 015); se porta y se añade **arm64**.

## Alcance
- Incluye: `Dockerfile` multi-stage, `.dockerignore`, `.node-version`, `pnpm docker:build`, suite `pnpm test:image`,
  workflow de GitHub Actions con checks `check`, `e2e` e `image`, y verificación de que la imagen compila para
  `linux/arm64`.
- **No incluye**: Prisma en la imagen ni MySQL en CI (los añade 004), publicar en un registro, despliegue (CD).

## Comportamiento (criterios de aceptación)
- **AC-1** — La imagen DEBE construirse con la versión de Node de `.node-version` y las dependencias exactas del
  lockfile (falla si no coinciden).
- **AC-2** — Con configuración válida el contenedor DEBE responder `GET /health` `200`; con configuración inválida DEBE
  terminar con código ≠ 0 nombrando la variable.
- **AC-3** — El proceso DEBE ejecutarse como usuario no root.
- **AC-4** — La imagen DEBE contener solo código compilado, dependencias de producción y `package.json` (sin TS,
  tests, docs, `.git` ni `.env*`) y ningún valor propio de un entorno.
- **AC-5** — La imagen DEBE declarar un healthcheck sobre `GET /health`.
- **AC-6** — CUANDO recibe `SIGTERM` (`docker stop`), el contenedor DEBE terminar con código `0` en menos de 10 s.
- **AC-7** — La imagen DEBE poder construirse para `linux/amd64` y `linux/arm64`.
- **AC-8** — En cada PR hacia `main` y push a `main`, GitHub Actions DEBE ejecutar `pnpm check`, `pnpm test:e2e` y
  `pnpm test:image` como checks separados (`check`, `e2e`, `image`), sin secretos, con permisos de solo lectura y
  cancelando ejecuciones anteriores del mismo PR; el job `image` DEBE además construir la imagen para `linux/arm64`.

## Contratos externos
- Imagen OCI (puerto `PORT`, def. 3000). Workflow `.github/workflows/ci.yml`. Archivo `.node-version`.

## Preguntas abiertas
_Ninguna._ Mismo diseño que traccar-adapter 014/015.
