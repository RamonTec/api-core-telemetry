# core-service

Núcleo de negocio de la plataforma: tenants, usuarios, flota (vehículos, GPS, conductores), facturación y verticales
(viajes, órdenes). Único servicio con el mapeo negocio ↔ Traccar.

- Producto: [docs/product/planning.md](docs/product/planning.md)
- Flujo de trabajo SDD: [docs/sdd/WORKFLOW.md](docs/sdd/WORKFLOW.md)
- Estándares: [docs/standards/](docs/standards/)
- Roadmap de specs: [docs/specs/ROADMAP.md](docs/specs/ROADMAP.md)
- Reglas para agentes (Claude Code / Antigravity): [AGENTS.md](AGENTS.md)

```bash
pnpm install
pnpm start:dev
pnpm check   # sync SDD + typecheck + lint + format + tests
```

## Variables de entorno

| Variable | Descripción | Obligatoria | Valor por defecto |
|---|---|---|---|
| `PORT` | Puerto HTTP del servicio | No | `3000` |
| `LOG_LEVEL` | Nivel de log (`debug`, `info`, `warn`, `error`) | No | `info` |
| `DATABASE_URL` | URL de conexión MySQL (`mysql://user:pass@host:port/db`) | Sí | — |
| `KEYCLOAK_ISSUER_URL` | URL del realm de Keycloak emisor de tokens | Sí | — |
| `KEYCLOAK_AUDIENCE` | Audiencia esperada en los JWTs de usuario | No | `core-service` |

## Base de datos

El servicio utiliza MySQL 8.4 y Prisma 7.

### Scripts de base de datos

- `pnpm db:generate`: genera el cliente de Prisma a partir de `prisma/schema.prisma`.
- `pnpm db:migrate:new -- <nombre>`: crea una nueva migración SQL sin aplicarla (`--create-only`).
- `pnpm db:migrate:dev`: aplica migraciones pendientes y genera cliente en entorno de desarrollo.
- `pnpm db:migrate:deploy`: aplica migraciones pendientes en entornos productivos o de test.

### Contenedor de base de datos para tests e2e

Para ejecutar los tests de integración y e2e en local contra una instancia real de MySQL:

```bash
pnpm test:infra:up    # Inicia MySQL 8.4 en un contenedor docker (puerto 3307)
pnpm test:e2e         # Ejecuta la suite e2e
pnpm test:infra:down  # Detiene el contenedor de test
```

## Imagen de contenedor

La misma imagen sirve para cualquier entorno: toda la configuración entra por las variables de entorno de arriba.

```bash
pnpm docker:build        # → core-service:local
docker run -d --name core-service --env-file <archivo> -p 3000:3000 core-service:local
```

- **Base**: `node:24.22.0-alpine3.24`. Solo `dist/`, dependencias de producción y `package.json`.
- **Usuario**: `node` (uid 1000), sin privilegios.
- **Sin estado local**: no requiere volúmenes persistentes.
- **Healthcheck**: `GET /health` (liveness) cada 10 s. La disponibilidad de dependencias está en `GET /health/ready`.
- **Apagado**: `SIGTERM` (`docker stop`) cierra la aplicación ordenadamente y sale con código 0 en menos de 10 s.
- **Tests de la imagen**: `pnpm test:image` (requiere Docker; fuera de `pnpm check`).

## Integración continua

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) se ejecuta en cada PR hacia `main` y en cada push a `main`,
con tres checks en paralelo:

| Check | Qué ejecuta | Reproducir en local |
|-------|-------------|---------------------|
| `check` | typecheck, lint, formato, sync de comandos SDD y tests unitarios | `pnpm check` |
| `e2e` | suites e2e in-process y proceso real | `pnpm test:e2e` |
| `image` | construye la imagen, ejecuta tests de contenedor y valida compilación arm64 | `pnpm test:image` |

- Versiones: Node de [`.node-version`](.node-version) (la misma que la imagen; `test:image` lo comprueba) y pnpm de
  `packageManager` en `package.json`. Dependencias exactas del lockfile.
- Sin secretos y con permisos de solo lectura (`permissions: contents: read`). Un push nuevo a un PR cancela la ejecución anterior.
