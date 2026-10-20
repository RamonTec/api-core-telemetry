# Contratos de core-service

| Documento | Qué describe | Consumidores principales |
|-----------|--------------|-------------------------|
| [`openapi.yaml`](openapi.yaml) (OpenAPI 3.1) | API REST de core-service: tenants, usuarios, flota, billing, health | Frontend (web-app), API Gateway, BFF |

Los contratos se verifican automáticamente contra el código en el ciclo de desarrollo y en CI mediante `pnpm check` y `pnpm test:e2e`:
- **Validez sintáctica y estructural**: `@readme/openapi-parser` y `Ajv2020` validan el esquema (`test/contracts/documents.spec.ts`).
- **Coherencia código ↔ contrato**: Cada endpoint y rol expuesto en los controladores de NestJS debe coincidir exactamente con el YAML (`test/contracts/routes.spec.ts`).
- **Validación de respuestas en ejecución**: Las respuestas JSON reales emitidas durante los tests e2e se validan contra los esquemas del contrato (`test/support/http-contract.ts`).

---

## 1. Mantenimiento del contrato en el ciclo SDD

1. **Añadir la ruta al YAML en el mismo task que la implementa**:
   - Cada nuevo endpoint, método HTTP o cambio de ruta debe registrarse en `docs/contracts/openapi.yaml` en el **mismo task** que introduce el código del controlador.
   - Si se expone una ruta en el código que no está en el YAML, o se documenta una ruta inexistente, `pnpm check` fallará automáticamente.

2. **Seguridad y roles (`x-required-roles`)**:
   - El servicio utiliza autenticación Bearer JWT con Keycloak (realm `telemetry`, client `core-service`).
   - **Rutas públicas**: Las rutas decoradas con `@Public()` deben declarar explícitamente `security: []`.
   - **Rutas protegidas**: Deben omitir `security: []` (heredando la seguridad global `keycloak`) y declarar obligatoriamente la propiedad `x-required-roles: [...]`.
   - La lista de `x-required-roles` debe contener exactamente los mismos roles (`Role`) definidos con el decorador `@Roles(...)` en el controlador o método (`tenant-admin`, `tenant-operator`, `tenant-viewer`, `driver`, `platform-operator`).

3. **Comandos y reintentos (`x-idempotent` y `x-retryable`)**:
   - **Idempotencia (`x-idempotent`)**: En operaciones de comando (`POST`, `PUT`, `PATCH`, `DELETE`), declarar `x-idempotent: true` cuando repetir la misma petición con los mismos datos sea seguro y no duplique recursos ni genere efectos colaterales indeseados.
   - **Reintentabilidad (`x-retryable`)**: Cada respuesta declarada en una operación debe incluir `x-retryable: true` o `x-retryable: false`:
     - `x-retryable: true`: Errores transitorios de red o servidor (`500 INTERNAL_ERROR`, `503 UPSTREAM_UNAVAILABLE`) donde el cliente puede reintentar con backoff exponencial.
     - `x-retryable: false`: Respuestas exitosas (`200`, `201`) o errores de cliente/negocio (`400`, `401`, `403`, `404`, `409`) donde un reintento idéntico fallará de la misma forma sin una acción correctiva previa.

4. **Formato estándar de errores (`ErrorBody` con `code` fijo)**:
   - Todo error sigue la estructura unificada de la plataforma (ADR-0002):
     ```json
     {
       "code": "VALIDATION_ERROR",
       "message": "Validation failed",
       "correlationId": "018f9f68-5c4e-7b2a-b6d3-246e7f8a9101",
       "details": [{ "path": "email", "message": "Invalid email format" }]
     }
     ```
   - Cada respuesta de error (`4xx`, `5xx`) debe referenciar `$ref: '#/components/schemas/ErrorBody'` y especificar una propiedad `code` con valor constante (`const: <CODIGO_ERROR>`).
   - Los clientes del servicio deben ramificar su comportamiento basándose exclusivamente en el valor de `code`, nunca en el texto de `message`.

---

## 2. Versionado del contrato (SemVer)

El campo `info.version` de `openapi.yaml` sigue el estándar de versionado semántico:

| Tipo de cambio | Regla | Ejemplos | Impacto en versión |
|----------------|-------|----------|-------------------|
| **Incompatible** (Breaking) | Quitar o renombrar un endpoint, método HTTP, parámetro o campo de respuesta; hacer obligatorio un campo opcional; cambiar un tipo de dato, un código de estado HTTP o un valor de `code` de error. | Renombrar `/health/ready` a `/health/status`; cambiar el tipo de un ID de numérico a string. | **Mayor** (`X.0.0`) |
| **Compatible** | Añadir nuevos endpoints, campos opcionales en el body de petición, nuevos campos en respuestas existentes o nuevos códigos de error específicos. | Nuevo endpoint `GET /tenants`; nuevo campo opcional en petición. | **Menor** (`0.X.0` / `1.X.0`) |
| **Documentación** | Corrección ortográfica o de estilo en `description`, `summary`, o adición de nuevos ejemplos (`examples`). | Mejorar explicaciones de parámetros o ejemplos de payload. | **Parche** (`0.0.X` / `1.0.X`) |

- Cualquier cambio incompatible (**mayor**) debe estar justificado en un spec aprobado, discutido y comunicado previamente a los equipos clientes (frontend, BFF, gateway).

---

## 3. Historial de versiones

| Versión | Documento | Fecha | Cambios |
|---------|-----------|-------|---------|
| 0.1.0 | `openapi.yaml` | 2026-10-19 | Versión inicial: endpoints de liveness (`GET /health`) y readiness (`GET /health/ready`), esquemas `ErrorBody` y `Readiness`, y esquema de autenticación `keycloak` con `x-audience` y `x-tenant-claim`. |
