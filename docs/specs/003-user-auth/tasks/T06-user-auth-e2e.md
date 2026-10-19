---
id: 003-T06
status: done           # todo | doing | blocked | done
depends_on: [003-T05]
covers: [AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10]
---

# 003-T06 — E2E de autenticación con tokens firmados

## Objetivo
Un Keycloak falso (JWKS local) firma tokens reales y un controller de prueba verifica todo el flujo por HTTP.

## Contexto (leer SOLO esto)
- `../traccar-adapter/test/app.e2e-spec.ts`
- `test/support/test-env.ts`
- `test/support/log-capture.ts`
- `src/app.module.ts`
- `src/shared/infrastructure/auth/auth.decorators.ts`

## Contrato
```ts
// test/support/fake-keycloak.ts
export interface FakeKeycloak { issuer: string; sign(claims: Record<string, unknown>, opts?: { expiresIn?: string; alg?: string; key?: 'other' }): Promise<string>; close(): Promise<void> }
export function createFakeKeycloak(): Promise<FakeKeycloak>;   // node:http en puerto 0, GET <issuer>/protocol/openid-connect/certs
// test/support/probe.controller.ts (solo tests)
@Controller('probe') class ProbeController {
  @Public() @Get('public') …; @Roles('tenant-admin','tenant-operator') @Get('tenant') whoami(@CurrentActor() a) { return a }
  @Roles('platform-operator') @Get('platform') …; @Get('unannotated') …
}
```

## Archivos a crear/modificar
- [x] `test/support/fake-keycloak.ts`, `test/support/probe.controller.ts` (nuevos)
- [x] `test/user-auth.e2e-spec.ts` (nuevo; módulo de test = `AppModule.register(testConfig({auth:{issuerUrl: fake.issuer}}))` + `controllers: [ProbeController]`)

## Criterios de aceptación
- [x] Un `it('AC-n: …')` por AC-1…AC-10 por HTTP. AC-3: issuer apuntando a un puerto cerrado → 503. AC-10: con `createLogCapture()`, la línea de request tiene `actor` y `tenantId` y no contiene el token.

## Notas
Verificación manual opcional (anotar en Handoff): con el stack de telemetry-infra en marcha, token *password grant* de `web-app` para `demo-admin` / `dev-password` y `KEYCLOAK_ISSUER_URL=http://keycloak:8080/realms/telemetry` desde la red `telemetry`.

## Fuera de alcance
- —

## Verificación
```bash
pnpm test:e2e
pnpm check
```

## Handoff
- Implementado `createFakeKeycloak` (`test/support/fake-keycloak.ts`) sirviendo JWKS local en puerto dinámico y firmando tokens RS256.
- Creado `ProbeController` (`test/support/probe.controller.ts`) con rutas `@Public()`, `@Roles(...)` y sin anotar.
- Creado suite E2E `test/user-auth.e2e-spec.ts` cubriendo AC-1 a AC-10 por HTTP. `pnpm check` y `pnpm test:e2e` en verde.
