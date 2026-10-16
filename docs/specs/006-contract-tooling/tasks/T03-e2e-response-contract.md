---
id: 006-T03
status: todo           # todo | doing | blocked | done
depends_on: [006-T01]
covers: [AC-5]
---

# 006-T03 — Validar respuestas e2e contra el contrato

## Objetivo
Las suites e2e registran cada respuesta y la validan contra el OpenAPI en `afterEach`.

## Contexto (leer SOLO esto)
- `../traccar-adapter/test/support/http-contract.ts`
- `test/app.e2e-spec.ts`
- `test/user-auth.e2e-spec.ts`
- `test/database.e2e-spec.ts`

## Archivos a crear/modificar
- [ ] `test/support/http-contract.ts` (nuevo, portado)
- [ ] `test/app.e2e-spec.ts`, `test/user-auth.e2e-spec.ts`, `test/database.e2e-spec.ts` (instalar `recordResponses` antes de `init()` y `expect(checkHttpContract(contract.take())).toEqual([])` en `afterEach`)

## Criterios de aceptación
- [ ] **AC-5** — Mutación comprobada: quitar el `503` de `/health/ready` en el YAML hace fallar `database.e2e-spec.ts` (revertir).

## Fuera de alcance
- —

## Verificación
```bash
pnpm test:e2e
pnpm check
```

## Handoff
