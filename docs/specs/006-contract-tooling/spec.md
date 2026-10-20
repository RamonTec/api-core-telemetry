---
id: 006-contract-tooling
status: done           # draft | approved | in-progress | done
requirements: [FND-FR10]
adrs: [PADR-001, PADR-004]
---

# 006 — Contrato OpenAPI publicado y verificado

## Problema
api-gateway y el frontend consumirán la API de core-service. Como en traccar-adapter (spec 016), el contrato debe estar
publicado y verificado contra el código desde el primer endpoint, para que cada fase añada sus rutas al contrato en el
mismo task que las implementa y nadie pueda desalinearlos.

## Alcance
- Incluye: `docs/contracts/openapi.yaml` (OpenAPI 3.1) con `/health`, `/health/ready`, el esquema de seguridad de
  usuario (PADR-004) y `ErrorBody`; validación del documento; test de rutas código ↔ documento; validación de las
  respuestas de los e2e contra el documento; guía de contratos con política de versiones.
- **No incluye**: endpoints de negocio (cada fase los añade), AsyncAPI (cuando core-service publique eventos, fase 5),
  generación de clientes.

## Comportamiento (criterios de aceptación)
- **AC-1** — El documento DEBE describir `GET /health` y `GET /health/ready` (públicos) con sus respuestas, el esquema
  `ErrorBody` (PADR-001) y un esquema de seguridad Bearer JWT de Keycloak como seguridad por defecto, indicando la
  audiencia `core-service`, el claim `tenant_id` y los roles (PADR-004).
- **AC-2** — SI el documento no es OpenAPI 3.1 válido, ENTONCES `pnpm check` DEBE fallar.
- **AC-3** — SI el servicio expone una ruta que no está documentada, o el documento describe una que no existe,
  ENTONCES `pnpm check` DEBE fallar.
- **AC-4** — Toda operación no pública del documento DEBE declarar los roles que exige (`x-required-roles`); SI falta,
  ENTONCES `pnpm check` DEBE fallar.
- **AC-5** — Las respuestas que producen las suites e2e para rutas documentadas DEBEN cumplir el esquema de su ruta y
  status; SI no, ENTONCES la suite DEBE fallar. Las rutas no documentadas (rutas de prueba) se ignoran.
- **AC-6** — `docs/contracts/README.md` DEBE explicar cómo añadir un endpoint al contrato en el mismo task y la política
  de versiones (semver; mayor = incompatible).

## Contratos externos
- `docs/contracts/openapi.yaml` versión `0.1.0` (pre-1.0 mientras no haya endpoints de negocio).

## Preguntas abiertas
_Ninguna._
