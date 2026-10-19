---
spec: 003-user-auth
status: approved        # draft | approved
---

# 003 — Diseño

Base: traccar-adapter 002 (`../traccar-adapter/src/shared/infrastructure/auth/*`), adaptado de tokens de servicio a
tokens de usuario y con el actor como objeto (no un string).

## Componentes
| Capa | Archivo | N/M | Responsabilidad |
|------|---------|-----|-----------------|
| shared/application | `src/shared/application/actor.ts` | N | Tipos `Actor`, `TenantRole`, `Role`, `TENANT_ROLES` |
| shared/infra | `src/shared/infrastructure/config/app-config.ts` | M | Sección `auth` (`KEYCLOAK_ISSUER_URL`, `KEYCLOAK_AUDIENCE`) |
| shared/infra | `src/shared/infrastructure/auth/jwt-verifier.ts` | N | Verifica el JWT y devuelve `VerifiedClaims` (portado; distingue `JWKS_UNAVAILABLE`) |
| shared/infra | `src/shared/infrastructure/auth/actor-from-claims.ts` | N | Reglas de PADR-004: claims → `Actor` o `ActorRejectedError` |
| shared/infra | `src/shared/infrastructure/auth/auth.decorators.ts` | N | `@Public()`, `@Roles(...)`, `@CurrentActor()`, `AuthenticatedRequest` |
| shared/infra | `src/shared/infrastructure/auth/user-auth.guard.ts` | N | Guard global (`APP_GUARD`) |
| shared/infra | `src/shared/infrastructure/auth/auth.module.ts` | N | Provee `JwtVerifier` (factory desde config) y el guard global |
| shared/infra | `src/shared/infrastructure/logging/pino-http-options.ts` | M | `customProps`: `actor`, `tenantId` desde `req.actor` |
| shared/infra | `health.controller.ts`, `readiness.controller.ts` | M | `@Public()` |
| raíz | `src/app.module.ts` | M | Importa `AuthModule`; `register(config, logStream?, overrides?: { jwtVerifier? })` |
| test | `test/support/fake-keycloak.ts` | N | Par de claves RS256, JWKS en `node:http` (puerto 0), `sign(claims, opts?)` |
| test | `test/support/probe.controller.ts` | N | Rutas de prueba (solo tests): pública, de tenant, de plataforma, sin anotar |
| test | `test/user-auth.e2e-spec.ts` | N | E2E con tokens firmados reales |

## Contratos internos
```ts
// shared/application/actor.ts
export const TENANT_ROLES = ['tenant-admin', 'tenant-operator', 'tenant-viewer', 'driver'] as const;
export type TenantRole = (typeof TENANT_ROLES)[number];
export type Role = TenantRole | 'platform-operator';
export type Actor =
  | { readonly kind: 'tenant-user'; readonly userId: string; readonly tenantId: string; readonly roles: readonly TenantRole[] }
  | { readonly kind: 'platform-operator'; readonly userId: string };

// config
export interface AuthConfig { readonly issuerUrl: string; readonly audience: string }   // AppConfig += auth

// jwt-verifier.ts
export interface VerifiedClaims {
  readonly sub: string;
  readonly tenantId: string | undefined;            // claim tenant_id (string) o undefined
  readonly clientRoles: readonly string[];          // resource_access[audience].roles
  readonly realmRoles: readonly string[];           // realm_access.roles
}
export type InvalidTokenReason = 'MALFORMED' | 'SIGNATURE' | 'EXPIRED' | 'CLAIMS' | 'ALGORITHM' | 'JWKS_UNAVAILABLE';
export class InvalidTokenError extends Error { constructor(readonly reason: InvalidTokenReason) }
export class JwtVerifier { constructor(config: AuthConfig, getKey?: JWTVerifyGetKey); verify(token: string): Promise<VerifiedClaims> }

// actor-from-claims.ts
export type ActorRejection = 'TENANT_ROLE_WITHOUT_TENANT' | 'INVALID_TENANT_ID' | 'OPERATOR_WITH_TENANT' | 'NO_KNOWN_ROLE';
export class ActorRejectedError extends Error { constructor(readonly reason: ActorRejection) }
export function actorFromClaims(claims: VerifiedClaims): Actor;   // lanza ActorRejectedError

// auth.decorators.ts
export const PUBLIC_KEY = 'auth:public'; export const ROLES_KEY = 'auth:roles';
export const Public: () => MethodDecorator & ClassDecorator;
export const Roles: (...roles: Role[]) => MethodDecorator & ClassDecorator;
export const CurrentActor: () => ParameterDecorator;               // req.actor (Actor)
export interface AuthenticatedRequest extends Request { actor?: Actor }
```

## Flujo (guard)
1. `@Public` → pasa. 2. Sin `@Roles` → `ForbiddenException` (AC-8). 3. Sin Bearer → `UnauthorizedException`.
4. `verify` → `InvalidTokenError` `JWKS_UNAVAILABLE` → `UpstreamUnavailableError('keycloak')` (503); otro motivo →
   log `warn {reason, msg:'Rejected user token'}` + 401. 5. `actorFromClaims` → `ActorRejectedError` → log `warn
   {reason}` + 403. 6. Rol requerido: `platform-operator` si `actor.kind === 'platform-operator'`; si no, intersección
   con `actor.roles`; vacía → 403. 7. `req.actor = actor`.

Reglas de `actorFromClaims` (PADR-004): `isOperator = realmRoles ∋ 'platform-operator'`; `tenantRoles = clientRoles ∩
TENANT_ROLES`. Operador: si `tenantId` o `tenantRoles.length` → `OPERATOR_WITH_TENANT`; si no → actor operador. Si no
es operador: `tenantRoles` vacío → `NO_KNOWN_ROLE`; sin `tenantId` → `TENANT_ROLE_WITHOUT_TENANT`; `tenantId` no UUID →
`INVALID_TENANT_ID`.

## Decisiones
- Denegación por defecto: una ruta nueva sin `@Roles` no queda abierta por olvido.
- JWKS caído → 503 (reintentable), no 401: el token puede ser válido.
- Tests con tokens **firmados de verdad** (clave RS256 de test + JWKS local), no un verificador falso: prueba la
  integración con `jose`. Comprobación manual adicional contra el Keycloak de telemetry-infra (usuarios de PADR-004).
