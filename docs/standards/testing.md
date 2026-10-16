# Estándar: Testing

> Recetas de código y trampas conocidas: skill `automated-testing` (`docs/sdd/skills/automated-testing/`).

## Estrategia por capa

| Capa | Tipo | Herramienta | Dobles |
|------|------|-------------|--------|
| domain | unit | Vitest | ninguno |
| application (use cases) | unit | Vitest | **fakes** en memoria de los ports (clases escritas a mano, no mocks mágicos) |
| infrastructure/outbound — repositorios | integración | Vitest + **MySQL de test** (contenedor) | — |
| infrastructure/outbound — clientes HTTP | integración | Vitest + servidor HTTP falso (`node:http`) | — |
| infrastructure/inbound | integración | `@nestjs/testing` + supertest | use case fake o verificador de JWT falso |
| flujo completo | e2e (`test/*.e2e-spec.ts`) | Vitest + supertest | MySQL real, traccar-adapter falso |

## Reglas

- **Test primero**: cada `AC-n` del task se traduce primero a un test que falla, luego se implementa.
- Nombre del test referencia el AC: `it('AC-2: rejects an IMEI with non-digit chars', ...)`.
- Unit tests junto al archivo: `register-vehicle.use-case.spec.ts`. Fakes en `<feature>/application/ports/__fakes__/`.
- Sin red, reloj, ids ni aleatoriedad reales en unit tests (inyectar `ClockPort`, `IdGeneratorPort`).
- **Aislamiento por tenant**: todo repositorio de un modelo con `tenantId` tiene un test que crea datos de dos tenants y
  comprueba que cada actor solo ve y modifica los suyos (incluido actualizar/borrar por id de otro tenant).
- Tests de BD: cada suite usa su propio esquema o limpia sus tablas; nunca dependen del orden ni de datos de otra suite.
- Cobertura objetivo: `domain` + `application` ≥ 90 % líneas. Infra: happy path + cada traducción de error.

## Definition of Done (por task)

1. Todos los `AC-n` del task tienen test y pasan.
2. `pnpm check` en verde (y `pnpm test:e2e` si el task lo indica en `Verificación`).
3. Sin `TODO` nuevos sin task asociado.
