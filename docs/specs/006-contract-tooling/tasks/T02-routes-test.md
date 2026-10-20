---
id: 006-T02
status: done           # todo | doing | blocked | done
depends_on: [006-T01]
covers: [AC-3, AC-4]
---

# 006-T02 — Test de rutas y roles código ↔ contrato

## Objetivo
`pnpm check` falla si una ruta del código no está documentada (o al revés) o si los roles documentados no coinciden con `@Roles`.

## Contexto (leer SOLO esto)
- `../traccar-adapter/test/contracts/routes.spec.ts`
- `src/shared/infrastructure/auth/auth.decorators.ts`
- `test/support/test-env.ts`
- `docs/contracts/openapi.yaml`

## Contrato
```ts
// por cada ruta expuesta: "METHOD /path" ∈ documento y viceversa
// @Public → operation.security deep-equals []
// @Roles(a, b) → operation['x-required-roles'] contiene exactamente [a, b] (orden indiferente)
```

## Archivos a crear/modificar
- [x] `test/contracts/routes.spec.ts` (nuevo, portado y adaptado)

## Criterios de aceptación
- [x] **AC-3** — Renombrar una ruta en el YAML hace fallar el test (comprobarlo y revertir).
- [x] **AC-4** — Una operación no pública sin `x-required-roles` hace fallar el test.

## Notas
El módulo se compila sin `init()`: no conecta a la BD ni a Keycloak.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
- Creado `test/contracts/routes.spec.ts` para contrastar las rutas expuestas por NestJS (`AppModule` sin `init()`) contra `docs/contracts/openapi.yaml`.
- Verifica que rutas `@Public()` tengan `security: []` y que operaciones protegidas declaren `x-required-roles` iguales a `@Roles(...)`.
- Verificada la falla del test al renombrar rutas o al omitir roles requeridos. `pnpm check` en verde.
