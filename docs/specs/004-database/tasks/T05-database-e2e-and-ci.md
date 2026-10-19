---
id: 004-T05
status: done          # todo | doing | blocked | done
depends_on: [004-T04]
covers: [AC-3, AC-4, AC-8]
---

# 004-T05 — MySQL para e2e (local y CI) y e2e de readiness

## Objetivo
`pnpm test:e2e` corre contra MySQL real con migraciones aplicadas, en local y en CI, y verifica el check `database`.

## Contexto (leer SOLO esto)
- `docs/specs/004-database/design.md`
- `vitest.config.e2e.ts`
- `test/support/test-env.ts`
- `.github/workflows/ci.yml`
- `../traccar-adapter/test/nats-connection.e2e-spec.ts`

## Contrato
```ts
// package.json: "test:infra:up": "docker run -d --rm --name core-service-test-mysql -e MYSQL_ROOT_PASSWORD=test -e MYSQL_DATABASE=core_test -p 3307:3306 mysql:8.4",
//               "test:infra:down": "docker stop core-service-test-mysql"
// test/support/global-setup.ts: espera a que MySQL acepte conexiones (≤ 60 s) y ejecuta `prisma migrate deploy` con DATABASE_URL = TEST_ENV.DATABASE_URL
// ci.yml job e2e: services: mysql: { image: mysql:8.4, env: { MYSQL_ROOT_PASSWORD: test, MYSQL_DATABASE: core_test }, ports: ['3307:3306'],
//                 options: --health-cmd="mysqladmin ping -ptest" --health-interval=5s --health-retries=20 }
```

## Archivos a crear/modificar
- [x] `package.json` (scripts `test:infra:*`), `vitest.config.e2e.ts` (`globalSetup`, `fileParallelism: false`), `test/support/global-setup.ts` (nuevo)
- [x] `test/database.e2e-spec.ts` (nuevo)
- [x] `.github/workflows/ci.yml` (job `e2e` con MySQL)

## Criterios de aceptación
- [x] **AC-3** — Con MySQL arriba: `/health/ready` → 200 `database:"ok"`; con `DATABASE_URL` a un puerto cerrado: la app arranca y `/health/ready` → 503 `database:"error"`.
- [x] **AC-4** — Tras `app.close()`, el pool queda cerrado (no quedan handles abiertos: Vitest termina).
- [x] **AC-8** — README: sección "Base de datos" con `test:infra:up` y los scripts `db:*`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm test:infra:up
pnpm test:e2e
pnpm check
```

## Handoff
- Infraestructura de test con MySQL 8.4 configurada para local (`test:infra:up/down`) y CI (`services.mysql`).
- `test/support/global-setup.ts` asegura conexión TCP antes de ejecutar `prisma migrate deploy`.
- E2E valida liveness/readiness de base de datos (`AC-3`) y cierre ordenado de conexiones (`AC-4`).
- T06 (imagen docker con migraciones al arranque) listo para implementarse como siguiente paso.
