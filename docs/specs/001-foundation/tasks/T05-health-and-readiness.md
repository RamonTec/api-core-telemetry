---
id: 001-T05
status: todo           # todo | doing | blocked | done
depends_on: []
covers: [AC-12, AC-13]
---

# 001-T05 — GET /health y GET /health/ready con registro de checks

## Objetivo
`GET /health` responde `{status:"ok"}` y `GET /health/ready` agrega los checks registrados (críticos y no críticos) e `info`.

## Contexto (leer SOLO esto)
- `../traccar-adapter/src/shared/infrastructure/http/health.controller.ts`
- `../traccar-adapter/src/shared/infrastructure/health/readiness.registry.ts`
- `../traccar-adapter/src/shared/infrastructure/health/readiness.controller.ts`
- `../traccar-adapter/src/shared/infrastructure/health/health.module.ts`
- `../traccar-adapter/src/shared/infrastructure/health/readiness.registry.spec.ts`

## Contrato
```ts
export class ReadinessRegistry {
  register(name: string, check: () => Promise<boolean>, opts?: { critical?: boolean }): void;   // critical por defecto true
  registerInfo(name: string, info: () => Record<string, number | null>): void;
  run(): Promise<{ ok: boolean; checks: Record<string, 'ok' | 'error' | 'down'>; info: Record<string, Record<string, number | null>> }>;
}
// GET /health/ready → 200|503 { status: 'ok'|'error', checks, ...info }
```

## Archivos a crear/modificar
- [ ] `src/shared/infrastructure/http/health.controller.ts` (nuevo) + spec
- [ ] `src/shared/infrastructure/health/readiness.registry.ts`, `readiness.controller.ts`, `health.module.ts` (nuevos) + spec del registry

## Criterios de aceptación
- [ ] **AC-12** — `GET /health` → `200 {status:"ok"}`.
- [ ] **AC-13** — Sin checks → `200 {status:"ok",checks:{}}`; check crítico falla → `503 status:"error"`; no crítico falla → `"down"` sin tumbar `ok`; un check que lanza cuenta como fallo.

## Notas
Quitar `@Public()` de los controllers (no hay auth hasta 003; 003 lo añadirá).

## Fuera de alcance
- Checks concretos (BD en 004).

## Verificación
```bash
pnpm check
```

## Handoff
