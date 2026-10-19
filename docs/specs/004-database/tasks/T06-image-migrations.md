---
id: 004-T06
status: done           # todo | doing | blocked | done
depends_on: [004-T05]
covers: [AC-9]
---

# 004-T06 — Imagen con Prisma: generate en build y migraciones al arrancar

## Objetivo
La imagen genera el cliente al construir, incluye lo necesario para `prisma migrate deploy` y lo ejecuta al arrancar salvo `RUN_MIGRATIONS=false`.

## Contexto (leer SOLO esto)
- `Dockerfile`
- `.dockerignore`
- `test/image/container.image-spec.ts`
- `test/image/docker.ts`
- `docs/specs/004-database/design.md`

## Contrato
```ts
# Dockerfile: build stage → COPY prisma/ prisma.config.ts; `pnpm build` (incluye prisma generate)
# runtime → RUN apk add --no-cache openssl; COPY prisma/ prisma.config.ts docker-entrypoint.sh; prisma CLI disponible
#           (moverlo a dependencies o copiarlo desde deps); ENTRYPOINT ["./docker-entrypoint.sh"]
# docker-entrypoint.sh:
#   #!/bin/sh
#   set -e
#   if [ "${RUN_MIGRATIONS:-true}" != "false" ]; then ./node_modules/.bin/prisma migrate deploy; fi
#   exec node dist/main.js
```

## Archivos a crear/modificar
- [x] `Dockerfile`, `.dockerignore` (modificados), `docker-entrypoint.sh` (nuevo, ejecutable)
- [x] `test/image/container.image-spec.ts`, `test/image/docker.ts` (VALID_ENV con `DATABASE_URL`, `KEYCLOAK_ISSUER_URL`; `RUN_MIGRATIONS=false` en los tests que no tienen BD; contenido esperado de `/app` actualizado)

## Criterios de aceptación
- [x] **AC-9** — `pnpm test:image` en verde: no-root, contenido mínimo (+ `prisma`, `prisma.config.ts`, `docker-entrypoint.sh`), healthcheck, `SIGTERM` → exit 0 < 10 s (el `exec` lo garantiza); con `RUN_MIGRATIONS=false` no intenta conectar a la BD.

## Notas
Un test con MySQL real para las migraciones al arrancar es opcional (red Docker de test con `mysql:8.4`, como el test de NATS de traccar-adapter); si se omite, anotarlo en el Handoff.

## Fuera de alcance
- —

## Verificación
```bash
pnpm test:image
pnpm check
```

## Handoff
- Dockerfile y runtime incluyen Prisma CLI, OpenSSL y schema/config para migraciones automáticas.
- `docker-entrypoint.sh` ejecuta `prisma migrate deploy` en arranque salvo `RUN_MIGRATIONS=false`.
- Pruebas de contenedor (`pnpm test:image`) validan no-root, contenido mínimo, healthcheck, SIGTERM exit 0 y bypass de BD con `RUN_MIGRATIONS=false`.
- Cierra spec 004 (última tarea).
