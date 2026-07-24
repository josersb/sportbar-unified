# BranchingStrategy

Estrategia de branching y entornos del proyecto SportBar Unified.

## Ramas principales

| Rama | Propósito | Entorno | Puerto |
|------|-----------|---------|--------|
| `master` | Producción | Bar (deploy final) | 3000 |
| `v2` | Staging / integración | Testing pre-prod | 3101 |
| `feat/*` | Feature branches | Worktrees aislados | 3102+ |

## Flujo de trabajo

```
feat/ahm-integration ──→ v2 ──→ master
     (3102)            (3101)   (3000)
```

1. **Feature branch** (`feat/*`): desarrollo aislado en worktree. Puerto dedicado (3102+). Commits frecuentes, push a remote como backup.
2. **Rebase periódico** desde `v2` para mantenerse al día con las mejoras.
3. **Merge a `v2`**: cuando la feature está completa y testeada. PR review en GitHub.
4. **Merge a `master`**: solo después de probar en `v2` (puerto 3101) y validar en el bar.

## Worktrees activos

| Worktree | Rama | Vite | Express | Script |
|----------|------|------|---------|--------|
| `sportbar-unified` | `v2` | 5173 | 3101 | `pnpm run sportbar:dev` |
| `sportbar-unified-worktrees/ahm-integration` | `feat/ahm-integration` | 5174 | 3102 | `pnpm run sportbar:dev` |

## Convenciones

- **Nunca commit directo a `master`**. Solo merge desde `v2`.
- **Nunca commit directo a `v2`**. Solo merge desde `feat/*` branches. (Excepción: hotfixes urgentes)
- **Todo feature branch se pushea a remote** como backup y para PR review.
- **Scripts `sportbar:dev` y `sportbar:build`** en cada worktree usan su puerto dedicado.
- **CORS y CSP** de cada worktree incluyen los puertos de todos los entornos activos.

## Relaciones

- [[../Configuracion/ViteProxy]] — configuración de proxy por entorno
- [[../Configuracion/Seguridad]] — CORS y CSP por puerto
- [[../README]] — documentación general
