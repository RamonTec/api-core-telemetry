---
id: 003-T04
status: todo           # todo | doing | blocked | done
depends_on: [003-T03]
covers: [AC-1, AC-2, AC-3, AC-6, AC-7, AC-8, AC-9]
---

# 003-T04 — Guard global, decoradores y wiring

## Objetivo
Un guard global aplica `@Public`/`@Roles`, construye el actor y lo deja en la request; `@CurrentActor()` lo entrega al handler.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/infrastructure/auth/service-auth.guard.ts`
- `../traccar-adapter/src/shared/infrastructure/auth/auth.decorators.ts`
- `../traccar-adapter/src/shared/infrastructure/auth/service-auth.guard.spec.ts`
- `src/app.module.ts`
- `src/shared/infrastructure/auth/actor-from-claims.ts`

## Contrato
```ts
export const PUBLIC_KEY = 'auth:public'; export const ROLES_KEY = 'auth:roles';
export const Public = () => SetMetadata(PUBLIC_KEY, true);
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
export const CurrentActor = createParamDecorator((_, ctx) => ctx.switchToHttp().getRequest<AuthenticatedRequest>().actor);
@Injectable() export class UserAuthGuard implements CanActivate { constructor(reflector: Reflector, verifier: JwtVerifier) }
export class AuthModule { static forRoot(config: AuthConfig, overrides?: { jwtVerifier?: JwtVerifier }): DynamicModule }  // APP_GUARD
// AppModule.register(config, logStream?, overrides?: { jwtVerifier?: JwtVerifier })
// Flujo: Public → true; sin Roles → 403; sin Bearer → 401; JWKS_UNAVAILABLE → UpstreamUnavailableError('keycloak');
// otro InvalidTokenError → warn {reason,msg:'Rejected user token'} + 401; ActorRejectedError → warn {reason} + 403;
// rol requerido no presente → 403; req.actor = actor.
```

## Archivos a crear/modificar
- [ ] `src/shared/infrastructure/auth/auth.decorators.ts`, `user-auth.guard.ts` (+ spec), `auth.module.ts` (nuevos)
- [ ] `src/app.module.ts` (importa `AuthModule`)
- [ ] `health.controller.ts` y `readiness.controller.ts` (`@Public()`)

## Criterios de aceptación
- [ ] **AC-1/2/3/6/7/8** — Spec del guard con un `JwtVerifier` falso (clase con `verify` controlado) y `Reflector` real.
- [ ] **AC-9** — `/health` y `/health/ready` sin token → 200 (e2e de 001 sigue en verde).

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
