---
spec: 002-container-ci
status: approved       # draft | approved
---

# 002 — Diseño

Se porta de traccar-adapter (`../traccar-adapter/`): `Dockerfile`, `.dockerignore`, `test/image/*`,
`vitest.config.image.ts`, `.github/workflows/ci.yml`. Cambios respecto al original:

| Tema | traccar-adapter | core-service |
|------|-----------------|--------------|
| Volumen | `VOLUME /app/data` (outbox) | **ninguno** (sin estado local) |
| Variables en la imagen | `NODE_ENV`, `OUTBOX_PATH` | solo `NODE_ENV=production` |
| Tests de imagen | arranque, config, usuario, contenido, env, healthcheck, apagado, volumen+NATS | los mismos **sin** volumen ni NATS |
| CI `e2e` | levanta NATS | sin servicios (004 añadirá MySQL) |
| CI `image` | `pnpm test:image` | `pnpm test:image` + `docker buildx build --platform linux/arm64` (QEMU) |

## Componentes
| Archivo | N/M | Responsabilidad |
|---------|-----|-----------------|
| `.node-version` | N | `24.22.0` (ya copiado en el bootstrap; verificar) |
| `Dockerfile` | N | Stages `deps` → `build` → `prod-deps` → `runtime` (`node:24.22.0-alpine3.24`, `USER node`, healthcheck con `node -e fetch`, `CMD ["node","dist/main.js"]`) |
| `.dockerignore` | N | Lista blanca: `package.json`, `pnpm-lock.yaml`, `pnpm-workspace.yaml`, `nest-cli.json`, `tsconfig*.json`, `src/` sin specs ni fakes |
| `package.json` | M | Scripts `docker:build`, `test:image` |
| `vitest.config.image.ts` | N | Suite `test/image/**/*.image-spec.ts`, serie, timeouts largos |
| `test/image/docker.ts` | N | `docker()`, `dockerOk()`, `runContainer()`, `waitHealthy()`, `httpInContainer()`, `removeAll()`, `stopTimed()` |
| `test/image/container.image-spec.ts` | N | AC-1…AC-6 |
| `.github/workflows/ci.yml` | N | Jobs `check`, `e2e`, `image` (+ arm64) |
| `README.md` | M | Secciones "Imagen de contenedor" e "Integración continua" |

## Decisiones
- `VALID_ENV` de los tests de imagen: vacío por ahora (001 no tiene variables obligatorias); 003/004 lo amplían.
- arm64 en CI: `docker/setup-qemu-action` + `docker/setup-buildx-action` y `docker buildx build --platform linux/arm64
  .` sin `--push` (solo verifica que compila). Los tests de imagen corren en amd64.
- Las peticiones HTTP de los tests se hacen desde dentro del contenedor (`docker exec … node -e fetch`): no dependen del
  reenvío de puertos del host.
