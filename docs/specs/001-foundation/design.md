---
spec: 001-foundation
status: draft          # draft | approved
---

# 001 — Diseño

Se **porta** el código de traccar-adapter (`../traccar-adapter/`), quitando lo específico de Traccar, NATS, webhooks y
outbox. Cada task indica qué archivo portar y qué quitar.

## Componentes
| Capa | Archivo | N/M | Responsabilidad | Origen en traccar-adapter |
|------|---------|-----|-----------------|---------------------------|
| shared/domain | `src/shared/domain/domain-error.ts` | N | Base de errores con `code` | igual |
| shared/domain | `src/shared/domain/validation.error.ts` | N | `VALIDATION_ERROR` con `details` | igual |
| shared/domain | `src/shared/domain/upstream-unavailable.error.ts` | N | `UPSTREAM_UNAVAILABLE` (503) | igual |
| shared/infra | `src/shared/infrastructure/http/error-http-status.ts` | N | Tabla código ↔ status | solo códigos genéricos |
| shared/infra | `src/shared/infrastructure/config/app-config.ts` | N | zod env, `loadConfig`, `parseEnv`, `APP_CONFIG` | solo `PORT`, `LOG_LEVEL` |
| shared/infra | `src/shared/infrastructure/logging/correlation-id.ts` | N | Resolver/generar correlation id | igual |
| shared/infra | `src/shared/infrastructure/logging/pino-http-options.ts` | N | Opciones pino-http (PADR-001 §4) | `SERVICE_NAME = 'core-service'`; sin `actor` (lo añade 003) |
| shared/infra | `src/shared/infrastructure/logging/logging.module.ts` | N | `LoggingModule.forRoot(config, stream?)` | igual |
| shared/infra | `src/shared/infrastructure/http/http-exception.filter.ts` | N | Toda excepción → `ErrorBody` | igual |
| shared/infra | `src/shared/infrastructure/http/zod-validation.pipe.ts` | N | DTO zod → `ValidationError` | igual |
| shared/infra | `src/shared/infrastructure/http/health.controller.ts` | N | `GET /health` | igual (sin `@Public`, llega en 003) |
| shared/infra | `src/shared/infrastructure/health/{readiness.registry,readiness.controller,health.module}.ts` | N | `GET /health/ready` con checks críticos/no críticos e `info` | igual |
| raíz | `src/app.module.ts`, `src/main.ts` | M | `AppModule.register(config, logStream?)`; bootstrap con shutdown hooks | quitar módulos de negocio, NATS, outbox, traccar, auth |
| raíz | `src/app.controller.ts`, `app.service.ts`, `app.controller.spec.ts` | borrar | Starter (AC-15) | — |
| test | `test/support/log-capture.ts`, `test/support/test-env.ts` | N | Captura de logs; `TEST_ENV` + `testConfig()` | reducidos |
| test | `test/app.e2e-spec.ts` | M | E2E de la foundation (in-process + proceso real) | secciones "In-process" y "Real process" |

Dependencias: `zod@^4`, `nestjs-pino`, `pino`, `pino-http` (mismas versiones que `../traccar-adapter/package.json`).

## Contratos internos
```ts
export abstract class DomainError extends Error { abstract readonly code: string; protected constructor(message: string) }
export class ValidationError extends DomainError { readonly code = 'VALIDATION_ERROR'; constructor(readonly details: ValidationIssue[]) }
export class UpstreamUnavailableError extends DomainError { readonly code = 'UPSTREAM_UNAVAILABLE'; constructor(readonly upstream: string) }
export const GENERIC_ERROR_HTTP_STATUS: { VALIDATION_ERROR: 400, UNAUTHORIZED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409, UPSTREAM_UNAVAILABLE: 503, INTERNAL_ERROR: 500 };
export const ERROR_HTTP_STATUS: Readonly<Record<string, number>>;   // = genéricos; los módulos añaden los suyos aquí
export function httpStatusForCode(code: string): number | undefined;
export function codeForHttpStatus(status: number): string;

export interface AppConfig { readonly port: number; readonly logLevel: LogLevel }
export function parseEnv<S extends z.ZodObject>(schema: S, env: Record<string, string | undefined>): z.infer<S>;
export function loadConfig(env: Record<string, string | undefined>): AppConfig;   // lanza ConfigValidationError(invalidVariables)

export class ReadinessRegistry {
  register(name: string, check: () => Promise<boolean>, opts?: { critical?: boolean }): void;
  registerInfo(name: string, info: () => Record<string, number | null>): void;
  run(): Promise<{ ok: boolean; checks: Record<string, 'ok' | 'error' | 'down'>; info: Record<string, Record<string, number | null>> }>;
}
export class AppModule { static register(config: AppConfig, logStream?: DestinationStream): DynamicModule }
```

## Flujo
`main.ts`: `loadConfig(process.env)` → inválida: línea JSON (`level:"error"`, `service`, `context:"Bootstrap"`,
`invalidVariables`) a stderr y `exit(1)` → `NestFactory.create(AppModule.register(config), { bufferLogs: true })` →
`useLogger` → `enableShutdownHooks([], { useProcessExit: true })` → `listen(config.port)`.

## Decisiones
- Portar en vez de rediseñar: el código ya está probado (16 specs) y cumple PADR-001.
- `test:e2e` hace `pnpm build` primero (los tests de proceso arrancan `dist/main.js`), como en traccar-adapter.
