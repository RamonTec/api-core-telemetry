---
id: 004-T01
status: done          # todo | doing | blocked | done
depends_on: []
covers: [AC-2]
---

# 004-T01 — Prisma 7: dependencias, config, schema vacío y scripts

## Objetivo
El repo genera el cliente Prisma (`pnpm db:generate`) en `src/shared/infrastructure/database/generated/` y tiene los scripts de migración, sin ninguna tabla todavía.

## Contexto (leer SOLO esto)
- `docs/specs/004-database/design.md`
- `package.json`
- `.gitignore`
- `.oxlintrc.json`
- `tsconfig.json`

## Contrato
```ts
// prisma.config.ts
import { defineConfig } from 'prisma/config';
export default defineConfig({ schema: 'prisma/schema.prisma', migrations: { path: 'prisma/migrations' },
  datasource: { url: process.env['DATABASE_URL'], shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'] } });
// prisma/schema.prisma
generator client { provider = "prisma-client"  output = "../src/shared/infrastructure/database/generated"  importFileExtension = "js"  moduleFormat = "esm" }
datasource db { provider = "mysql" }
// scripts: "db:generate": "prisma generate", "db:migrate:new": "prisma migrate dev --create-only --name",
//          "db:migrate:dev": "prisma migrate dev", "db:migrate:deploy": "prisma migrate deploy",
//          "postinstall": "prisma generate", "build": "prisma generate && nest build"
```

## Archivos a crear/modificar
- [x] `package.json`, `pnpm-workspace.yaml` (nuevo), `prisma.config.ts` (nuevo), `prisma/schema.prisma` (nuevo)
- [x] `.gitignore`, `.oxlintrc.json` (`ignorePatterns`), `.prettierignore` (nuevo) → ignorar `src/shared/infrastructure/database/generated/`

## Criterios de aceptación
- [x] **AC-2** — `pnpm install` regenera el cliente; `pnpm build` y `pnpm check` en verde; `git status` no muestra archivos generados.

## Notas
No ejecutes `prisma init`: instala skills en `.claude/`, `.agents/`, `.windsurf/` y rompe `pnpm sdd:sync --check`. Crea los archivos a mano.
pnpm 11 bloquea los scripts de instalación: añade `pnpm-workspace.yaml` con `allowBuilds: { prisma: true, '@prisma/engines': true }` (si `pnpm install` pide otros, decide y anótalo en el Handoff).
Versiones fijadas: `prisma`, `@prisma/client`, `@prisma/adapter-mariadb` **7.10.x** (la etiqueta `latest` de `prisma` apunta a una 8.0 RC: no la uses).

## Fuera de alcance
- Modelos y migraciones (no hay tablas en esta fase).

## Verificación
```bash
pnpm check
```

## Handoff
- Prisma 7.10.1 configurado con generador cliente ESM en `src/shared/infrastructure/database/generated/`.
- `pnpm-workspace.yaml` añadido con `allowBuilds` para `prisma` y `@prisma/engines`.
- Scripts `db:*`, `postinstall` y `build` actualizados en `package.json`.
- Directorio generado ignorado en `.gitignore`, `.oxlintrc.json` y `.prettierignore`.
