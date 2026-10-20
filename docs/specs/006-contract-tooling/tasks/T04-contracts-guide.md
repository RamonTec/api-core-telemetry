---
id: 006-T04
status: done           # todo | doing | blocked | done
depends_on: [006-T02, 006-T03]
covers: [AC-6]
---

# 006-T04 — Guía de contratos y enlace en README

## Objetivo
`docs/contracts/README.md` explica cómo mantener el contrato y su versionado.

## Contexto (leer SOLO esto)
- `../traccar-adapter/docs/contracts/README.md`
- `README.md`

## Archivos a crear/modificar
- [x] `docs/contracts/README.md` (nuevo)
- [x] `README.md` (sección "Contratos")

## Criterios de aceptación
- [x] **AC-6** — La guía cubre: añadir la ruta al YAML en el mismo task que la implementa, `x-required-roles`, `x-idempotent`/`x-retryable` en comandos, `ErrorBody` con `code` fijo por respuesta, semver (mayor = incompatible) e historial de versiones.

## Fuera de alcance
- —

## Verificación
```bash
pnpm check
```

## Handoff
- Creada guía `docs/contracts/README.md` con política de actualización en el mismo task, roles `x-required-roles`, idempotencia/reintentabilidad, `ErrorBody` tipado, SemVer e historial.
- Enlazada la guía y especificación OpenAPI en `README.md` (sección "Contratos").
- `pnpm check` en verde. Todos los tasks de spec 006 finalizados.
