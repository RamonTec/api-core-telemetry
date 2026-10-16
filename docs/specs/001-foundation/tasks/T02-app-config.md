---
id: 001-T02
status: todo           # todo | doing | blocked | done
depends_on: []
covers: [AC-1, AC-2, AC-7]
---

# 001-T02 — Configuración por entorno validada con zod

## Objetivo
`loadConfig(env)` valida `PORT` y `LOG_LEVEL` y lanza `ConfigValidationError` con **todos** los nombres inválidos.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/infrastructure/config/app-config.ts`
- `../traccar-adapter/src/shared/infrastructure/config/app-config.spec.ts`
- `docs/standards/coding.md`

## Contrato
```ts
export const LOG_LEVELS = ['debug', 'info', 'warn', 'error'] as const;
export interface AppConfig { readonly port: number; readonly logLevel: LogLevel }
export const APP_CONFIG = Symbol('AppConfig');
export class ConfigValidationError extends Error { constructor(readonly invalidVariables: readonly string[]) }
export function parseEnv<S extends z.ZodObject>(schema: S, env: Record<string, string | undefined>): z.infer<S>; // '' = ausente
export function loadConfig(env: Record<string, string | undefined>): AppConfig;
```

## Archivos a crear/modificar
- [ ] `src/shared/infrastructure/config/app-config.ts` (nuevo) + `.spec.ts`
- [ ] `package.json` (`pnpm add zod@^4`)

## Criterios de aceptación
- [ ] **AC-1** — Env vacío → `{ port: 3000, logLevel: "info" }`.
- [ ] **AC-2** — `PORT=abc LOG_LEVEL=verbose` → `ConfigValidationError` con `invalidVariables` = `["PORT","LOG_LEVEL"]` (sin valores en el mensaje).
- [ ] **AC-7** — `LOG_LEVEL` solo acepta `debug|info|warn|error`.

## Notas
Portar solo `PORT` y `LOG_LEVEL`: las secciones `auth`, `traccar`, `webhook`, `nats`, `outbox` del original no existen aquí (auth llega en 003, BD en 004).

## Fuera de alcance
- Variables de auth o BD.

## Verificación
```bash
pnpm check
```

## Handoff
