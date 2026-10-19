---
id: 003-T03
status: done            # todo | doing | blocked | done
depends_on: [003-T01, 003-T02]
covers: [AC-2, AC-3]
---

# 003-T03 — Verificador de JWT de usuario (jose)

## Objetivo
`JwtVerifier.verify(token)` valida firma (JWKS), `iss`, `aud`, `exp` y RS256, y devuelve `VerifiedClaims`; los fallos se clasifican en `InvalidTokenError(reason)`.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/infrastructure/auth/jwt-verifier.ts`
- `../traccar-adapter/src/shared/infrastructure/auth/jwt-verifier.spec.ts`
- `src/shared/infrastructure/auth/actor-from-claims.ts`
- `src/shared/infrastructure/config/app-config.ts`

## Contrato
```ts
export interface VerifiedClaims { readonly sub: string; readonly tenantId: string | undefined; readonly clientRoles: readonly string[]; readonly realmRoles: readonly string[] }

export type InvalidTokenReason = 'MALFORMED' | 'SIGNATURE' | 'EXPIRED' | 'CLAIMS' | 'ALGORITHM' | 'JWKS_UNAVAILABLE';
export class InvalidTokenError extends Error { constructor(readonly reason: InvalidTokenReason) }
export class JwtVerifier { constructor(config: AuthConfig, getKey?: JWTVerifyGetKey); verify(token: string): Promise<VerifiedClaims> }
// sub obligatorio (si falta → CLAIMS). tenant_id: string o undefined. Roles: resource_access[config.audience].roles y realm_access.roles, filtrando no-strings.
```

## Archivos a crear/modificar
- [x] `src/shared/infrastructure/auth/jwt-verifier.ts` (nuevo, portado) + spec
- [x] `package.json` (`pnpm add jose`, versión de traccar-adapter)

## Criterios de aceptación
- [x] **AC-2** — Tests con claves generadas por `jose` (`generateKeyPair("RS256")`, `createLocalJWKSet`): firma de otra clave → `SIGNATURE`; expirado → `EXPIRED`; `iss`/`aud` distintos → `CLAIMS`; HS256 → `ALGORITHM`; basura → `MALFORMED`.
- [x] **AC-3** — `getKey` que falla por red → `JWKS_UNAVAILABLE`.
- [x] Token válido → `VerifiedClaims` con `sub`, `tenantId`, `clientRoles`, `realmRoles`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
Implementado `JwtVerifier` con `jose` verificando tokens RS256 contra JWKS (remoto con caché/cooldown o inyectado para tests).
Clasifica errores en `InvalidTokenError` (`MALFORMED`, `SIGNATURE`, `EXPIRED`, `CLAIMS`, `ALGORITHM`, `JWKS_UNAVAILABLE`) y extrae `VerifiedClaims`. Desbloquea T04.
