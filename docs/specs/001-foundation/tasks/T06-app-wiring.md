---
id: 001-T06
status: todo           # todo | doing | blocked | done
depends_on: [001-T02, 001-T03, 001-T04, 001-T05]
covers: [AC-1, AC-2, AC-14, AC-15]
---

# 001-T06 — AppModule, bootstrap y retirada del starter

## Objetivo
`AppModule.register(config, logStream?)` monta logging, filtro global y health; `main.ts` valida config, arranca y apaga ordenadamente. El starter desaparece.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/app.module.ts`
- `../traccar-adapter/src/main.ts`
- `src/app.module.ts`
- `src/main.ts`

## Contrato
```ts
export class AppModule { static register(config: AppConfig, logStream?: DestinationStream): DynamicModule }
// main.ts: loadConfig → (ConfigValidationError → JSON a stderr {level:'error',service,context:'Bootstrap',msg:'Invalid environment variables',invalidVariables} + exit 1)
//          → NestFactory.create(AppModule.register(config), { bufferLogs: true }) → useLogger → enableShutdownHooks([], { useProcessExit: true }) → listen(port)
```

## Archivos a crear/modificar
- [ ] `src/app.module.ts`, `src/main.ts` (modificados)
- [ ] Borrar `src/app.controller.ts`, `src/app.service.ts`, `src/app.controller.spec.ts`
- [ ] `test/support/test-env.ts` (nuevo: `TEST_ENV` vacío por ahora + `testConfig(overrides?)`)

## Criterios de aceptación
- [ ] **AC-1** — `pnpm build && PORT=<libre> node dist/main.js` responde `/health`.
- [ ] **AC-2** — Env inválido → exit 1 y línea JSON en stderr.
- [ ] **AC-14** — `SIGTERM` → exit 0.
- [ ] **AC-15** — `GET /` → 404 `NOT_FOUND`.

## Notas
Del `app.module.ts` original solo se conservan `LoggingModule`, `HealthModule` y el `APP_FILTER`. Nada de Traccar, NATS, outbox, ingestion, auth ni audit.

## Fuera de alcance
- —

## Verificación
```bash
pnpm build
pnpm check
```

## Handoff
