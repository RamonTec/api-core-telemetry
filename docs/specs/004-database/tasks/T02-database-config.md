---
id: 004-T02
status: todo           # todo | doing | blocked | done
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
- [ ] `src/shared/infrastructure/config/app-config.ts` (modificado) + spec
- [ ] `test/support/test-env.ts` (`DATABASE_URL: process.env.DATABASE_TEST_URL ?? "mysql://root:test@127.0.0.1:3307/core_test"`)

## Criterios de aceptación
- [ ] **AC-1** — Ausente o sin `mysql://` → `ConfigValidationError` con `DATABASE_URL`; el mensaje no contiene el valor.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
