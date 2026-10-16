# core-service — Mapa de módulos y fases

- Estado: **borrador para revisión** (2026-10-16).
- Fuentes: [arquitectura de la plataforma](../../../telemetry-infra/docs/platform/architecture.md) (§12: decisiones del
  descubrimiento), PADR-001…003 y los [contratos de traccar-adapter](../../../traccar-adapter/docs/contracts/README.md).

**Cómo se trabaja (en cascada):** este documento solo identifica módulos, fases y reglas comunes. El planning
detallado de cada fase (requisitos, reglas, secuencias, preguntas) se escribe **al empezar esa fase**, en
`docs/product/phases/NN-<modulo>.md`, y de él salen sus specs. No se diseña una fase antes de cerrar la anterior.

## Propósito
core-service es el **núcleo de negocio** de la plataforma: dueño de los tenants (empresas cliente), sus usuarios, su
flota (vehículos, GPS, conductores), su facturación y la lógica de las verticales (viajes y órdenes). Es el único
servicio que conoce el **mapeo** entre el negocio y Traccar (`tenant ↔ traccar_group_id`,
`gps ↔ traccar_device_id`) y la **asignación** de cada GPS a un vehículo en el tiempo. Está separado de la telemetría
a propósito: una caída de Traccar, de NATS o de telemetry-service no puede impedir gestionar tenants ni facturación.

## Reglas comunes (aplican a todas las fases)
- **Hexagonal por feature**: `domain` ← `application` ← `infrastructure`, forzado por lint. El dominio no conoce
  Prisma, NestJS ni Traccar.
- **MySQL (esquema `core`) con Prisma schema-first**: SQL de cada migración revisado y commiteado; cliente Prisma solo
  en adaptadores.
- **Multitenancy con `tenant_id`**: toda tabla de negocio lo lleva y toda operación se filtra por el tenant del actor,
  con tests de aislamiento por repositorio.
- **Traccar solo a través de traccar-adapter** (contrato OpenAPI, token *client credentials*, PADR-002).
- **Nunca mover un GPS entre tenants**; un IMEI reutilizado es un registro nuevo.
- **Borrado lógico** para lo que tenga historial. **Auditoría** de toda escritura (actor, tenant, operación, resultado).
- **Convenciones PADR-001** (correlación, `ErrorBody`, health, logs) y **contrato OpenAPI** verificado por tests.
- **Dinero** en enteros de la unidad mínima + moneda; **fechas** en UTC; **datos personales** mínimos y nunca en logs.

## Requisitos: IDs por módulo
Cada fase numera sus requisitos con el prefijo de su módulo para no renumerar al crecer:
`FND` (fundación), `TEN` (tenancy), `FLT` (fleet), `IDN` (identity), `BIL` (billing), `TEL` (telemetry-mapping),
`TRV` (travels), `ORD` (orders). Ejemplo: `FLT-FR3`, `BIL-NFR1`.

## Módulos
| Módulo | Qué cubre | Depende de |
|--------|-----------|------------|
| **foundation** (transversal) | Config, logging, errores, health, OpenAPI base, CI, imagen; autenticación de usuarios (JWT), actor + tenant + rol en cada petición; MySQL + Prisma + aislamiento por tenant | — |
| **tenancy** | Alta de tenant por el operador, su group de Traccar, primer administrador, estados del tenant | foundation |
| **fleet** | Vehículos; registro de GPS por IMEI (traccar-adapter); asignación GPS↔vehículo con historial; baja/reactivación; conductores | tenancy |
| **identity** | Gestión de usuarios del tenant y sus roles (admin, operador, solo lectura, conductor), alineados con Keycloak | tenancy |
| **billing** | Planes (precio por vehículo, verticales), suscripción mensual, cálculo de periodos, pagos manuales, impago → gracia → solo lectura | fleet (vehículos activos) |
| **telemetry-mapping** | Lo que telemetry-service necesita: `group → tenant`, `device + instante → vehículo` | fleet; se diseña junto con telemetry-service |
| **travels** | Viajes v1: programado → en curso → completado/cancelado, retraso | fleet, billing (acceso por plan) |
| **orders** | Órdenes de entrega v1: pendiente → asignada → en ruta → entregada/fallida, confirmación manual o por geocerca | fleet, billing; geocercas (telemetry-service) |

## Fases
| Fase | Módulo | Resultado al cerrarla | Ideas ya capturadas (se refinan al llegar) |
|------|--------|-----------------------|--------------------------------------------|
| **0** | foundation | Servicio vacío pero desplegable: CI, imagen, auth de usuarios, BD con aislamiento probado | Validar el JWT reenviado por api-gateway (defensa en profundidad); tenant en Keycloak como group + claim `tenant_id`; operador de plataforma sin tenant |
| **1** | tenancy | El operador da de alta un tenant y existe su group en Traccar y su primer admin | Alta pendiente → group en Traccar → activo, con reintento; estados `activo → gracia → solo lectura → suspendido`; suspender deshabilita sus GPS |
| **2** | fleet | Un GPS registrado y asignado a un vehículo reporta en Traccar y llega a NATS (**primer flujo de punta a punta**) | IMEI único entre activos; 1 GPS activo por vehículo, reasignable con vigencia; baja → `disable`; conductor con usuario opcional; ¿GPS sin vehículo (inventario)? |
| **3** | identity | El admin gestiona los usuarios de su tenant | Usuarios creados vía Admin API de Keycloak; un tenant por usuario |
| **4** | billing | Cada tenant tiene plan y suscripción; impago lo pasa a solo lectura | Cobro por vehículo activo/mes; pagos manuales; pasarela detrás de un port después; días de gracia y moneda por definir |
| **5** | telemetry-mapping | telemetry-service sabe a qué tenant y vehículo pertenece cada posición | Recomendado: core-service publica eventos de dominio en NATS y telemetry-service guarda su copia |
| **6** | travels | Viajes v1 operativos | Recorrido real consultado a telemetry-service |
| **7** | orders | Órdenes v1 operativas | Dueño de las geocercas por decidir (afecta a la confirmación automática) |

**Otros servicios en paralelo**: telemetry-service puede empezar al cerrar la fase 2 (ya hay posiciones de GPS reales
de un tenant) y su diseño cierra la fase 5; realtime-gateway después; api-gateway cuando haya frontend.

## Fuera de alcance de core-service
Guardar posiciones o eventos y evaluar alertas (telemetry-service), WebSockets (realtime-gateway), enrutado y rate
limit (api-gateway), hablar con Traccar directamente (traccar-adapter). Versiones posteriores: pasarela de pagos,
alta autoservicio, facturas fiscales, app móvil, prueba de entrega, rutas multi-parada, viajes con paradas/pasajeros
o recurrentes.
