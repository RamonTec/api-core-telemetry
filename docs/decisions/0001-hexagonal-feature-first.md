# ADR-0001 — Hexagonal organizada por feature, con capas puras sin NestJS ni Prisma

- Estado: aceptado
- Fecha: 2026-10-16
- Origen: mismo patrón que traccar-adapter ADR-0001, probado en sus 16 specs.

## Contexto
La plataforma exige hexagonal por servicio (architecture.md §5). Trabajamos con micro-tasks ejecutados por agentes con
contexto limitado: interesa que un task toque un solo directorio y que las reglas de capas se verifiquen solas.

## Decisión
- Layout `src/modules/<feature>/{domain,application,infrastructure}` + `src/shared/` (`docs/standards/architecture.md`).
- `domain` y `application` sin `@nestjs/*` ni `@prisma/*`; use cases como clases planas registradas con `useFactory`.
- Ports definidos en el módulo consumidor; los transversales en `shared/application/ports`.
- Reglas de importación forzadas con `no-restricted-imports` en `.oxlintrc.json`.

## Consecuencias
- (+) Use cases testeables sin `TestingModule` ni BD; violaciones de capa fallan en `pnpm lint`.
- (+) Cambiar MySQL/Prisma o el cliente de traccar-adapter solo toca adaptadores.
- (−) Más boilerplate: mappers entre filas de Prisma y entidades de dominio, wiring con tokens.
