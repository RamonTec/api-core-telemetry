---
id: 003-T05
status: done           # todo | doing | blocked | done
depends_on: [003-T04]
covers: [AC-10]
---

# 003-T05 — Actor y tenant en el log de request

## Objetivo
El log de fin de request incluye `actor` (`userId`) y `tenantId` cuando la request está autenticada.

## Contexto (leer SOLO esto)
- `src/shared/infrastructure/logging/pino-http-options.ts`
- `src/shared/infrastructure/logging/logging.module.spec.ts`
- `../traccar-adapter/src/shared/infrastructure/logging/pino-http-options.ts`

## Contrato
```ts
customProps: (req) => ({ correlationId, ...(req.actor && { actor: req.actor.userId }), ...(req.actor?.kind === 'tenant-user' && { tenantId: req.actor.tenantId }) })
```

## Archivos a crear/modificar
- [x] `src/shared/infrastructure/logging/pino-http-options.ts` (modificado) + caso en `logging.module.spec.ts`

## Criterios de aceptación
- [x] **AC-10** — Con `req.actor` tenant → `actor` y `tenantId`; operador → solo `actor`; sin actor → ninguno.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
- Implementado `customProps` en `buildPinoHttpOptions` (`pino-http-options.ts`) con función auxiliar `actorProps(req)` que extrae `actor: actor.userId` y condicionalmente `tenantId: actor.tenantId` cuando `actor.kind === 'tenant-user'`.
- Añadidos tests de integración en `logging.module.spec.ts` bajo suite `AC-10: actor and tenant in request log` verificando los tres comportamientos (tenant user con `actor` y `tenantId`, platform operator con `actor` sin `tenantId`, y request no autenticada sin ninguno).
- `pnpm check` en verde.
