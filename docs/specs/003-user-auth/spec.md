---
id: 003-user-auth
status: done     # draft | approved | in-progress | done
requirements: [FND-FR3, FND-FR4, FND-FR5, FND-FR6, FND-NFR4]
adrs: [PADR-004, PADR-001]
---

# 003 — Autenticación de usuarios y contexto de actor

## Problema
Todas las operaciones de core-service se hacen en nombre de un usuario (empleado de un tenant o el operador de la
plataforma). Cada petición debe llegar con un token de Keycloak válido del que se obtengan **quién**, **de qué tenant**
y **con qué rol**, sin que el cliente pueda falsearlo (PADR-004). Los casos de uso necesitan ese actor explícito para
aplicar el aislamiento por tenant y auditar.

## Alcance
- Incluye: validación del JWT de usuario (firma con JWKS, `iss`, `aud`, `exp`, RS256); construcción del **actor** según
  las reglas de PADR-004; rutas públicas; autorización por roles declarada en cada ruta; denegación por defecto;
  actor y tenant en el log de request; configuración de Keycloak.
- **No incluye**: tokens de servicio (llamadas S2S entrantes, fase 5), crear o gestionar usuarios en Keycloak (fase 3),
  rutas de negocio (fase 1+), modo solo lectura (fase 4).

## Comportamiento (criterios de aceptación)
- **AC-1** — SI una ruta protegida se llama sin `Authorization: Bearer <token>`, ENTONCES `401 UNAUTHORIZED`.
- **AC-2** — SI el token tiene firma inválida, está expirado, su `iss` o `aud` no coinciden o su algoritmo no es RS256,
  ENTONCES `401 UNAUTHORIZED` y un log `warn` con el motivo, nunca con el token.
- **AC-3** — SI no se puede obtener el JWKS de Keycloak, ENTONCES `503 UPSTREAM_UNAVAILABLE`.
- **AC-4** — CUANDO el token es válido y tiene `tenant_id` (UUID) y roles de tenant, el handler DEBE recibir un actor
  `{ kind: "tenant-user", userId: <sub>, tenantId, roles }` con los roles de `resource_access.core-service.roles`.
- **AC-5** — CUANDO el token es válido y tiene el rol de realm `platform-operator`, sin `tenant_id` ni roles de tenant,
  el handler DEBE recibir `{ kind: "platform-operator", userId: <sub> }`.
- **AC-6** — SI el token viola las reglas de PADR-004 (rol de tenant sin `tenant_id`, `tenant_id` que no es UUID,
  `platform-operator` con `tenant_id` o con roles de tenant, ningún rol reconocido), ENTONCES `403 FORBIDDEN`.
- **AC-7** — SI la ruta declara roles y el actor no tiene ninguno de ellos, ENTONCES `403 FORBIDDEN`.
- **AC-8** — SI una ruta no declara roles ni es pública, ENTONCES `403 FORBIDDEN` para cualquier token (denegación por
  defecto).
- **AC-9** — `GET /health` y `GET /health/ready` DEBEN responder sin token.
- **AC-10** — El log de cada request autenticada DEBE incluir `actor` (el `sub`) y `tenantId` cuando exista.
- **AC-11** — `KEYCLOAK_ISSUER_URL` (URL, obligatoria) y `KEYCLOAK_AUDIENCE` (def. `core-service`) se validan al
  arrancar; inválidas → el proceso termina nombrándolas.

## Contratos externos
- Token de Keycloak según PADR-004: `sub`, `tenant_id`, `resource_access.core-service.roles`, `realm_access.roles`,
  `aud` ∋ `core-service`, `iss` = `KEYCLOAK_ISSUER_URL`. JWKS: `<issuer>/protocol/openid-connect/certs`.
- Respuestas `401 UNAUTHORIZED`, `403 FORBIDDEN`, `503 UPSTREAM_UNAVAILABLE` con `ErrorBody` (PADR-001).

## Preguntas abiertas
_Ninguna._ Resueltas en PADR-004 (2026-10-16).
