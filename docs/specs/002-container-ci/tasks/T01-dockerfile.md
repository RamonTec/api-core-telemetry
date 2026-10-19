---
id: 002-T01
status: done          # todo | doing | blocked | done
depends_on: []
covers: [AC-1, AC-3, AC-4, AC-5]
---

# 002-T01 — Dockerfile, .dockerignore y script docker:build

## Objetivo
`pnpm docker:build` produce `core-service:local`: runtime mínimo, no-root, con healthcheck en `/health`.

## Contexto (leer SOLO esto)
- `../traccar-adapter/Dockerfile`
- `../traccar-adapter/.dockerignore`
- `package.json`
- `.node-version`

## Archivos a crear/modificar
- [x] `Dockerfile` (nuevo, portado: sin `VOLUME` ni `OUTBOX_PATH`)
- [x] `.dockerignore` (nuevo, añadir `pnpm-workspace.yaml` a la lista blanca si existe)
- [x] `package.json` (`"docker:build": "docker build -t core-service:local ."`)

## Criterios de aceptación
- [x] **AC-1** — `pnpm docker:build` OK con `--frozen-lockfile`.
- [x] **AC-3/4/5** — Verificación rápida: `docker image inspect` muestra `User: node` y healthcheck; `docker run --rm --entrypoint sh core-service:local -c "ls -A /app"` → `dist node_modules package.json`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm docker:build
pnpm check
```

## Handoff
- `Dockerfile` multi-stage con `node:24.22.0-alpine3.24`, sin volúmenes locales ni outbox.
- `.dockerignore` filtra código fuente y configs esenciales excluyendo tests y fakes.
- Script `docker:build` en `package.json` construye `core-service:local`.
- `User: node`, healthcheck en `/health` y contenido de `/app` (`dist node_modules package.json`) verificado. Listo para T02.

