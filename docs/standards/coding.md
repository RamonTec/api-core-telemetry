# Estándar: Código

## TypeScript

- `strict`. Prohibido `any` en `domain`/`application`; en `infrastructure` solo en el borde y se convierte de inmediato
  a `unknown` + validación.
- ESM: imports relativos con extensión `.js`.
- `readonly` por defecto en entidades/VO. Sin setters; cambios de estado vía métodos con nombre de negocio
  (`vehicle.retire()`).
- Sin `export default`. Un concepto público por archivo.
- Sin comentarios que repitan el código; solo el *por qué* cuando no es obvio.

## Nombres

- Código, identificadores, mensajes de log y de error: **inglés**. Documentación SDD: español.
- Clases `PascalCase`, archivos `kebab-case.<rol>.ts` (tabla en `architecture.md`).
- Vocabulario de negocio: `Tenant`, `User`, `Vehicle`, `GpsDevice`, `GpsAssignment`, `Driver`, `Plan`,
  `Subscription`, `Travel`, `DeliveryOrder`. Los conceptos de Traccar (`group`, `device`) solo aparecen como
  referencias externas (`traccarGroupId`, `traccarDeviceId`) y en los clientes de traccar-adapter.

## Ids, dinero y tiempo

- Ids de entidades: **UUID v7** generados en la aplicación vía `IdGeneratorPort` (testeable); `CHAR(36)` en MySQL.
- Dinero: entero en la unidad mínima (`amountMinor`) + `currency` (ISO 4217). Nunca `float`.
- Fechas: UTC siempre (`DateTime` de Prisma, `TIMESTAMP(3)`); ISO-8601 en la API.

## Errores

- Dominio/aplicación lanzan errores tipados que extienden `DomainError` (`shared/domain/domain-error.ts`) con `code`
  estable (`TENANT_NOT_FOUND`).
- Errores de Prisma y de clientes HTTP se traducen en el adapter (p.ej. violación de unicidad → error de dominio;
  traccar-adapter `503` → `UpstreamUnavailableError`); nunca llegan al use case.
- El mapeo `code` → HTTP status vive en un único exception filter (`shared/infrastructure/http`), según PADR-001.

## Validación

- Entrada HTTP: DTO validado en el borde con **zod**; errores → `400 VALIDATION_ERROR` con `details` (PADR-001).
- Invariantes de negocio: en el constructor/factory de la entidad o VO (`Imei.create(raw)`), no en el controller.

## Logging

- `nestjs-pino`, formato y campos según **PADR-001 §4** (JSON, `correlationId` en cada línea).
- Nunca loguear tokens, headers de auth ni datos personales (nombres, teléfonos, emails, licencias).

| Nivel | Cuándo |
|-------|--------|
| `error` | Fallo inesperado (bug, 5xx no mapeado, error no manejado). |
| `warn` | Anómalo pero esperado o recuperable: rechazo de negocio, upstream caído, reintento. |
| `info` | Hecho de negocio completado. |
| `debug` | Diagnóstico; nunca necesario en producción. |

### Auditoría de operaciones

Cada ejecución de un use case de **escritura** emite **exactamente una** línea de auditoría, con éxito o fallo, vía
`AuditLogPort` + `ClockPort` y el helper `runAudited` (ADR-0003, patrón de traccar-adapter ADR-0006).

| Campo | Contenido |
|-------|-----------|
| `msg` / `op` | `<recurso>.<acción>` en inglés: `tenant.create`, `vehicle.register` |
| `actor` | id del usuario (`sub`) o del cliente de servicio |
| `tenantId` | tenant afectado (si aplica) |
| `result` | éxito con nombre (`created`, `existing`…), rechazo con nombre propio o `failed` |
| `durationMs` | entero, ms |
| ids de negocio | solo los que existan; nunca datos personales |

- Nivel `info` en éxito, `warn` en rechazo o `failed`. El adapter fija `context: 'Audit'` y nunca lanza.
- Controllers y demás adaptadores de entrada **no** auditan.

## Configuración

- Toda config por variables de entorno, validadas al arranque con zod (fail fast). Sin defaults para secretos.
