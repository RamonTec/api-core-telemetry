---
description: SDD fase 4 — implementar UN micro-task (TDD) y cerrarlo
argument-hint: <NNN>-<Tnn>  (ej. 004-T03)
---

> **Argumento** (`<ARG>`): `$ARGUMENTS`. Si arriba aparece literal `$ARGUMENTS` o vacío, `<ARG>` es el texto que el usuario escribió tras el comando; si no escribió nada, pregúntalo.

Implementa el task `<ARG>`.

1. Localiza el archivo: `docs/specs/<NNN>-*/tasks/<Tnn>-*.md`. Léelo.
2. Verifica que todos sus `depends_on` estén `done` en el `tasks.md` del spec. Si no, para.
3. Lee **solo** los archivos de su sección `Contexto`. No leas spec.md, design.md ni planning.md. Si falta información para cumplir un AC: marca el task `blocked`, escribe en `## Handoff` qué falta, y para.
4. Marca `status: doing` (front-matter y `tasks.md`).
5. TDD con el skill `automated-testing`: por cada AC, escribe el test (`it('AC-n: ...')`), comprueba que falla, implementa lo mínimo, pasa.
6. Toca solo los archivos listados en `Archivos a crear/modificar`. Si necesitas otro, para y avisa.
7. Ejecuta los comandos de `Verificación` y `pnpm check`. Deben quedar en verde.
8. Revisa tu diff (`git diff`) contra esta checklist. Si algún punto falla, corrígelo o repórtalo como desviación:
    - **Existencia**: cada API, método, opción o decorador de NestJS, Prisma, zod o jose que usaste existe en la versión
      instalada (compruébalo en `node_modules` o en los tipos, no de memoria). Ningún import a un archivo que no existe.
    - **Alcance**: sin dependencias nuevas en `package.json`, sin archivos fuera de la lista del task, sin `TODO` sin
      task asociado.
    - **Capas**: lógica de negocio solo en `domain`/`application`; el controller solo valida, obtiene el `Actor`,
      invoca y mapea.
    - **Auth** (si hay endpoint): `@Roles` con el mínimo de roles (o `@Public` justificado en el design); el `Actor`
      llega entero al use case.
    - **Tenant**: el `tenantId` sale del `Actor`, nunca de body/query/path; recurso de otro tenant → `404`.
    - **Entrada**: DTO zod con `z.strictObject`, `.max()` en strings y arrays, ids con `z.uuid()`.
    - **Salida**: respuesta construida con mapper; sin entidades ni modelos Prisma serializados; sin datos internos en
      mensajes de error ni en logs.
    - **Tests**: cada AC con su test; si hay endpoint protegido, los 4 tests de seguridad de
      `docs/standards/security.md`; si hay repositorio con `tenantId`, test de aislamiento.
9. Cierre: `status: done` en ambos sitios, rellena `## Handoff` (≤ 5 líneas). Si es el último task del spec, marca el spec `done`.
10. Propón el commit `feat(<NNN>-<Tnn>): <título>` según `docs/standards/git.md` y pide confirmación antes de commitear.

Reporta: ACs cubiertos, resultado de `pnpm check`, y cualquier desviación.
