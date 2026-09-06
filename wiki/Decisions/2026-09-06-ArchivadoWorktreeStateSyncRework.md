# Archivado del Worktree State-Sync-Rework

**Fecha**: 2026-09-06
**Tipo**: Decision — gestión de worktrees / cierre de ciclo de feature

## Contexto

El ciclo SDD `state-sync-rework` (rediseño del backend: State Broker, writeQueue, reconciler, SSE, semáforo global) se completó, verificó contra hardware real (stress test 87/87 PASS) y se mergeó a `v2` en modo fast-forward (`f8ab1e5` → `34c4414`, pusheado). El worktree `sportbar-unified-worktrees/state-sync-rework` quedaba entonces duplicando el estado de `v2` sin ningún commit propio.

## Decisión

Eliminar el worktree y la rama local `feat/state-sync-rework`, conservando la rama remota `origin/feat/state-sync-rework` hasta el deploy `v2 → master`.

## Verificaciones previas (orden: acción destructiva primero, documentación después)

1. `git status --porcelain` en el worktree → **limpio**, cero cambios sin commitear.
2. `git log v2..feat/state-sync-rework` → **vacío**, cero commits fuera de `v2`.
3. El tip de la rama (`34c4414`) era idéntico al HEAD de `v2` → la rama no aportaba historia única.
4. Los artefactos SDD quedan preservados en `openspec/changes/archive/2026-08-29-state-sync-rework/` (versionados en el repo).

Con todo verde, el borrado no podía perder nada: el contenido del worktree era copia exacta de `v2` o artefactos ignorados (`node_modules`, `worktree.config.json`).

## Tradeoffs

| Decisión | Consecuencia aceptada |
|---|---|
| Rama local borrada (`git branch -d`, red de seguridad nativa de merged-only) | Recuperable vía reflog durante el período de gracia; la historia vive en `v2` |
| `origin/feat/state-sync-rework` **conservada** | Ref gratis de prudencia hasta el deploy a `master`; se limpia después |
| Config del worktree (`worktree.config.json`, puertos 5175→... asignados) perdida | Irrelevante: es gitignored y desechable por diseño; la tabla de puertos vive en AGENTS.md |
| Registro en wiki **sin commit a `v2`** | Los cambios viajan con la próxima feature o se commitean con aprobación explícita (regla: nunca commit directo a `v2`) |

## Lección operativa (Windows)

`git worktree remove` falla en Windows con **"Filename too long"** sobre los `node_modules` de pnpm (paths profundos en `.pnpm/`). Solución confiable: espejar un directorio vacío con `robocopy /MIR /XJ` sobre el worktree, eliminar el directorio remanente, y recién entonces `git worktree prune` + `git branch -d`. Git ya había desregistrado el worktree pese al error de borrado físico, por lo que `git worktree list` puede quedar inconsistente con el disco hasta limpiarlo.

## Referencias

- [[../Configuracion/BranchingStrategy]] — flujo de ramas y worktrees
- [[../AGENTS]] — reglas obligatorias del orquestador sobre worktrees
- [[../log]] — entrada de este cambio en el registro
