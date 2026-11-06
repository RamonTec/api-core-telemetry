# Estándar: Seguridad

Reglas de autenticación, autorización, validación y superficie de ataque. Parten de PADR-002 (S2S), PADR-004
(identidad y claims de tenant) y ADR-0002 (aislamiento en Prisma). Lo marcado **pendiente** no está implementado
todavía: necesita su propio spec antes de existir en código.

## Autenticación (PADR-004, PADR-002)

- El único punto que lee y verifica el token de usuario es el guard global `UserAuthGuard`
  (`shared/infrastructure/auth`, registrado como `APP_GUARD`): firma con JWKS, `iss`, `aud`, `exp`. Ningún controller ni
  use case vuelve a leer `Authorization`.
- El `Actor` sale **solo** de `actorFromClaims`. Nunca se confía en cabeceras puestas por otro servicio
  (`x-tenant-id`, `x-user-id`…) ni en que la red sea interna.
- JWKS no disponible → `503 UPSTREAM_UNAVAILABLE`, nunca dejar pasar la petición.
- Llamadas salientes S2S: token propio por `client_credentials` (PADR-002). **Nunca** se reenvía el token del usuario a
  otro servicio.

## Autorización

- **Cerrado por defecto** (ya implementado en el guard): una ruta sin `@Roles(...)` ni `@Public()` responde `403`. No se
  cambia este comportamiento.
- `@Public()` solo para `GET /health*` y endpoints con mecanismo propio (p.ej. webhook con token compartido). Cada uso
  nuevo se justifica en el `design.md` del spec.
- Cada endpoint declara el **mínimo** de roles necesario. El `design.md` incluye la matriz `Endpoint | Roles`, y los
  tasks la copian.
- Dos niveles:
  - **Rol** (grueso) → `@Roles` en el controller.
  - **Reglas finas** (propiedad, estado: un `driver` solo ve sus viajes, un `tenant-viewer` no escribe) → en el use
    case, con el `Actor`; se rechaza con un `DomainError` de código `FORBIDDEN` (o uno propio mapeado a `403`).
- El controller pasa el `Actor` completo al use case (`@CurrentActor()`), nunca `userId`/`tenantId` sueltos.
- `platform-operator`: las operaciones sobre un tenant reciben el tenant objetivo **explícito** en la ruta; el use case
  comprueba `actor.kind` y la auditoría registra ese `tenantId`.

## Aislamiento por tenant

- El `tenantId` sale del `Actor`; nunca del body, query ni path (salvo la excepción del operador de plataforma).
- Los repositorios de modelos con `tenantId` usan el cliente con la extensión de aislamiento (`tenant-scope.ts`).
- Un recurso de otro tenant responde **igual que uno inexistente**: `404 NOT_FOUND`, nunca `403` (no revelar que
  existe).
- Prohibidos `$queryRawUnsafe` y `$executeRawUnsafe`. Si una consulta *raw* es inevitable: `Prisma.sql` con
  parámetros, filtro `tenantId` explícito y su propio test de aislamiento.

## Validación de entrada

- Todo lo que entra (body, query, params y las cabeceras que se usen) se valida con zod en el borde
  (`ZodValidationPipe`). Nada llega al use case sin validar.
- Objetos con `z.strictObject(...)`: un campo desconocido → `400`. Así nadie puede colar `tenantId`, `id`, `status` o
  `createdAt` en un body (*mass assignment*).
- Límites siempre explícitos:

| Tipo | Regla |
|------|-------|
| `string` | `.max(n)` siempre; `.trim()` en texto libre; formatos con su validador (`z.uuid()`, `z.email()`) |
| número | `.int()` cuando aplique, con `.min()`/`.max()` |
| array | `.max(n)` siempre |
| enum | `z.enum([...])` cerrado, nunca `string` libre |
| ids en path | `z.uuid()` antes de llegar a Prisma |
| paginación | `limit` con valor por defecto 20 y máximo 100; `offset`/cursor validado |

- Las invariantes de negocio viven en el VO/entidad (`coding.md`); zod solo valida forma y límites.

## Salida y errores

- Las respuestas se construyen con un mapper explícito a un DTO de salida. Nunca se serializa una entidad ni un modelo
  Prisma tal cual (evita filtrar campos internos al añadir columnas).
- El exception filter global ya oculta stack traces y mensajes internos en los `5xx`. Los mensajes de `DomainError` son
  **públicos**: sin datos de otro tenant, SQL, rutas internas ni datos personales.
- Las respuestas cumplen `docs/contracts/openapi.yaml` (spec 006).

## Secretos y logging

- Secretos solo por variables de entorno, validados al arranque, sin valores por defecto (`coding.md`). Nunca en
  código, fixtures ni `docs/`. En tests, valores ficticios evidentes (`test-secret`).
- La redacción de `authorization` y `cookie` en pino ya existe; no se quita. No se loguean tokens, claims completos ni
  datos personales (`coding.md` › Logging).

## Llamadas salientes y webhooks

- Destinos solo desde configuración. Nunca se llama a una URL o host que venga del cliente (SSRF).
- Todo cliente HTTP tiene timeout y traduce sus errores (`coding.md` › Errores).
- Tokens compartidos (webhooks) se comparan con `crypto.timingSafeEqual`, nunca con `===`.

## Dependencias

- No se añade una dependencia sin justificarlo en el `design.md` (qué resuelve, mantenimiento activo, licencia).
- La versión y la API se verifican en el registro o en `node_modules`, nunca de memoria.
- `pnpm-lock.yaml` commiteado; CI instala con `--frozen-lockfile` (ya implementado).

## Tests de seguridad obligatorios

Por endpoint protegido (integración, `@nestjs/testing` + supertest con verificador de JWT falso):

1. Sin token → `401`.
2. Token válido con un rol no permitido → `403`.
3. Body con un campo desconocido o un valor fuera de rango → `400 VALIDATION_ERROR`.
4. Recurso de otro tenant → `404` (en endpoints que reciben un id).

Repositorios: test de aislamiento por tenant (`testing.md`).

## Endurecimiento pendiente (requiere spec)

| Control | Estado |
|---------|--------|
| Cabeceras de seguridad (`helmet`) | pendiente |
| CORS cerrado: solo orígenes de configuración | pendiente |
| Límite de tamaño del body | pendiente |
| Rate limiting (aquí o en api-gateway: decidir en PADR) | pendiente |
| `pnpm audit --prod` sin `high`/`critical` en CI | pendiente |
| Lint: un módulo no importa internals de otro | pendiente |
| Lint: prohibir `$queryRawUnsafe`/`$executeRawUnsafe` | pendiente |
