---
id: 003-T01
status: todo           # todo | doing | blocked | done
depends_on: []
covers: [AC-4, AC-5, AC-6]
---

# 003-T01 — Tipos de actor y reglas de PADR-004 (claims → actor)

## Objetivo
`actorFromClaims(claims)` devuelve el `Actor` o lanza `ActorRejectedError` con el motivo, según PADR-004.

## Contexto (leer SOLO esto)
- `docs/standards/architecture.md`
- `../telemetry-infra/docs/platform/decisions/0004-user-identity-and-tenant-claims.md`

## Contrato
```ts
export const TENANT_ROLES = ['tenant-admin', 'tenant-operator', 'tenant-viewer', 'driver'] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];
export type Role = TenantRole | 'platform-operator';
export type Actor =
  | { readonly kind: 'tenant-user'; readonly userId: string; readonly tenantId: string; readonly roles: readonly TenantRole[] }
  | { readonly kind: 'platform-operator'; readonly userId: string };

export interface VerifiedClaims { readonly sub: string; readonly tenantId: string | undefined; readonly clientRoles: readonly string[]; readonly realmRoles: readonly string[] }

export type ActorRejection = 'TENANT_ROLE_WITHOUT_TENANT' | 'INVALID_TENANT_ID' | 'OPERATOR_WITH_TENANT' | 'NO_KNOWN_ROLE';
export class ActorRejectedError extends Error { constructor(readonly reason: ActorRejection) }
export function actorFromClaims(claims: VerifiedClaims): Actor;
// Reglas: isOperator = realmRoles ∋ 'platform-operator'; tenantRoles = clientRoles ∩ TENANT_ROLES (en el orden de TENANT_ROLES).
// Operador: tenantId o tenantRoles.length → OPERATOR_WITH_TENANT; si no → { kind:'platform-operator', userId: sub }.
// No operador: tenantRoles vacío → NO_KNOWN_ROLE; sin tenantId → TENANT_ROLE_WITHOUT_TENANT; tenantId no UUID → INVALID_TENANT_ID.
```

## Archivos a crear/modificar
- [ ] `src/shared/application/actor.ts` (nuevo)
- [ ] `src/shared/infrastructure/auth/actor-from-claims.ts` (nuevo; `VerifiedClaims` se define aquí y T03 lo importa) + spec

## Criterios de aceptación
- [ ] **AC-4** — Claims con `tenant_id` UUID y `clientRoles:["tenant-admin","otro"]` → actor tenant con `roles:["tenant-admin"]`.
- [ ] **AC-5** — `realmRoles:["platform-operator"]` sin tenant → actor operador.
- [ ] **AC-6** — Un test por cada `ActorRejection`.

## Fuera de alcance
- Verificación del JWT (T03), guard (T04).

## Verificación
```bash
pnpm check
```

## Handoff
