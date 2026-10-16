# Estándar: Arquitectura

Hexagonal (ports & adapters), organizada **por feature primero, capa después** (ADR-0001): un task suele tocar un solo
módulo, así el contexto a cargar es pequeño. Mismo patrón que traccar-adapter.

## Layout

```
src/
  main.ts
  app.module.ts
  shared/                         # transversal, sin lógica de negocio
    domain/                       # DomainError, errores base, tipos puros compartidos
    application/
      ports/                      # puertos transversales: AuditLogPort, ClockPort, IdGeneratorPort
      actor.ts                    # Actor (quién, tenant, roles): lo reciben los use cases
    infrastructure/
      config/                     # carga y validación de env (zod)
      logging/                    # nestjs-pino, correlation-id
      http/                       # exception filter, ErrorBody, health, zod pipe
      auth/                       # verificación del JWT de usuario, guard, decoradores (@Public, @Roles, @CurrentActor)
      audit/                      # PinoAuditLogAdapter, SystemClock, AuditModule (@Global)
      database/                   # PrismaService, extensión de aislamiento por tenant, readiness
  modules/
    <feature>/                    # tenancy | fleet | identity | billing | ...
      domain/                     # entidades, value objects, errores de dominio
      application/
        ports/                    # interfaces que el use case necesita (repositorios, clientes externos)
        use-cases/                # un archivo por use case
      infrastructure/
        inbound/                  # controllers HTTP, DTOs
        outbound/                 # repositorios Prisma, clientes HTTP (traccar-adapter)
      <feature>.module.ts         # wiring DI
prisma/
  schema.prisma                   # fuente de verdad del esquema (ADR-0002)
  migrations/                     # SQL generado y revisado, commiteado
test/                             # e2e
docs/contracts/openapi.yaml       # contrato publicado
```

## Regla de dependencias (enforced por `.oxlintrc.json`)

| Capa | Puede importar | No puede importar |
|------|----------------|-------------------|
| `domain` | `shared/domain` | `@nestjs/*`, `@prisma/*`, `application`, `infrastructure`, libs de I/O |
| `application` | `domain`, `shared/domain`, `shared/application` | `@nestjs/*`, `@prisma/*`, `infrastructure` |
| `infrastructure` | todo lo anterior, NestJS, Prisma, libs externas | — |

- Un módulo **no** importa internals de otro módulo. Si un módulo necesita algo de otro, lo pide por un **port** propio
  cuyo adapter llama al use case público del otro módulo, o lo sube a `shared/`.
- Use cases: clases TS planas (sin decoradores), registradas en `<feature>.module.ts` con `useFactory` + tokens.
- Ports en el módulo que los **consume**: `<Algo>Port` + `export const <ALGO>_PORT = Symbol('<Algo>Port')`. Los
  transversales (auditoría, reloj, ids) en `shared/application/ports/`, provistos por módulos `@Global()`.
- Adaptadores de entrada solo traducen transporte ↔ use case: validan, obtienen el `Actor`, invocan y mapean. Sin reglas
  de negocio ni auditoría.

## Persistencia (ADR-0002)

- El **cliente Prisma solo existe en `infrastructure`** (repositorios y `shared/infrastructure/database`).
- Los repositorios devuelven **entidades de dominio**, nunca tipos generados por Prisma. Mapper en el propio archivo del
  repositorio o en `outbound/<entidad>.mapper.ts`.
- Cada cambio de esquema: `schema.prisma` + migración generada con `--create-only`, SQL revisado, en el **mismo commit**.

## Multitenancy

- Toda entidad de negocio de un tenant lleva `tenantId`. Los repositorios de esos modelos usan el cliente con la
  **extensión de aislamiento** (spec 004): toda operación queda filtrada por el tenant del actor.
- Los use cases reciben el `Actor` y **nunca** aceptan un `tenantId` del cliente HTTP para operar: el tenant sale del
  token. Excepción: operaciones del operador de plataforma, que declaran explícitamente el tenant objetivo.

## Convenciones de archivos

| Elemento | Archivo | Clase/símbolo |
|----------|---------|---------------|
| Entidad | `domain/vehicle.ts` | `Vehicle` |
| Value object | `domain/imei.ts` | `Imei` |
| Error de dominio | `domain/errors.ts` | `ImeiAlreadyActiveError extends DomainError` |
| Port | `application/ports/vehicle-repository.port.ts` | `VehicleRepositoryPort`, `VEHICLE_REPOSITORY_PORT` |
| Use case | `application/use-cases/register-vehicle.use-case.ts` | `RegisterVehicleUseCase.execute(input)` |
| Repositorio | `infrastructure/outbound/prisma-vehicle.repository.ts` | `PrismaVehicleRepository implements VehicleRepositoryPort` |
| Cliente externo | `infrastructure/outbound/traccar-adapter-device.http-client.ts` | `...HttpClient implements ...Port` |
| Controller | `infrastructure/inbound/vehicle.controller.ts` | `VehicleController` |
| DTO | `infrastructure/inbound/dto/register-vehicle.dto.ts` | `registerVehicleSchema` (zod) + tipo |

## Restricciones de dominio

- Nunca una operación que mueva un GPS (device) a otro tenant. Un IMEI reutilizado es un registro nuevo.
- Nunca borrado físico de entidades con historial: estados + `deletedAt`/`endedAt`.
- Los ids de Traccar (`traccarGroupId`, `traccarDeviceId`) son referencias externas: se guardan, no se usan para reglas.
