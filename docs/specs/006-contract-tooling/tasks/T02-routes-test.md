---
id: 006-T02
status: todo           # todo | doing | blocked | done
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
- [ ] `test/contracts/routes.spec.ts` (nuevo, portado y adaptado)

## Criterios de aceptación
- [ ] **AC-3** — Renombrar una ruta en el YAML hace fallar el test (comprobarlo y revertir).
- [ ] **AC-4** — Una operación no pública sin `x-required-roles` hace fallar el test.

## Notas
El módulo se compila sin `init()`: no conecta a la BD ni a Keycloak.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
