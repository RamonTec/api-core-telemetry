---
id: 004-T02
status: done          # todo | doing | blocked | done
depends_on: []
covers: [AC-1]
---

# 004-T02 — DATABASE_URL en la configuración

## Objetivo
`AppConfig.database.url` desde `DATABASE_URL` obligatoria con esquema `mysql://`.

## Contexto (leer SOLO esto)
- `src/shared/infrastructure/config/app-config.ts`
- `src/shared/infrastructure/config/app-config.spec.ts`
- `test/support/test-env.ts`

## Contrato
```ts
export interface DatabaseConfig { readonly url: string }   // AppConfig += database; zod: z.string().regex(/^mysql:\/\/.+/)
```

## Archivos a crear/modificar
- [x] `src/shared/infrastructure/config/app-config.ts` (modificado) + spec
- [x] `test/support/test-env.ts` (`DATABASE_URL: process.env.DATABASE_TEST_URL ?? "mysql://root:test@127.0.0.1:3307/core_test"`)

## Criterios de aceptación
- [x] **AC-1** — Ausente o sin `mysql://` → `ConfigValidationError` con `DATABASE_URL`; el mensaje no contiene el valor.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
- Añadida interfaz DatabaseConfig e integrada en AppConfig.database.url.
- DATABASE_URL requerida y validada con /^mysql:\/\/.+/ en appEnvSchema.
- ConfigValidationError reporta DATABASE_URL protegiendo credenciales en el mensaje.
- Configurado TEST_ENV y testConfig() en test/support/test-env.ts con DATABASE_TEST_URL.
