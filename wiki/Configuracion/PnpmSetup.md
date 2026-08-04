# PnpmSetup

Configuración del gestor de paquetes pnpm como herramienta exclusiva del proyecto SportBar Unified. Define versiones exactas, seguridad de supply chain, y el entorno Node requerido.

## ¿Por qué pnpm?

| Criterio | npm | pnpm |
|----------|-----|------|
| Optional deps en Windows | Bug #4828 — no instala correctamente | Funciona con hard links |
| Espacio en disco | ~170 MB | ~50 MB |
| Velocidad | Normal | 2-3× más rápido |
| Lockfile | `package-lock.json` | `pnpm-lock.yaml` |

npm tiene un bug documentado que impide instalar dependencias opcionales nativas (`@rollup/rollup-win32-x64-msvc`) en Windows. pnpm lo resuelve con hard links al almacen global.

## Archivos de configuración

### `.npmrc`
Define el comportamiento de instalación:

- `save-exact=true` — versiones exactas, sin `^` ni `~`
- `engine-strict=true` — fuerza la versión de Node declarada
- `ignore-scripts=true` — bloquea scripts de instalación automáticos (seguridad)
- `allow-builds[]=@rollup/*`, `@vitejs/*`, `esbuild` — paquetes autorizados a ejecutar build scripts
- `minimum-release-age=1440` — espera 24h antes de instalar paquetes nuevos (supply chain)
- `block-exotic-subdeps=true` — previene dependencias de fuentes no estándar (git, tarballs)
- `omit=optional` — omite dependencias opcionales
- `prefer-offline=true` — prioriza cache local
- `registry=https://registry.npmjs.org/`

### `.nvmrc`
```
18.17.1
```
Define Node 18.17.1 como versión requerida. En Windows, nvm-windows no lee `.nvmrc` automáticamente — se necesita el script `scripts/nvm-auto-switch.ps1`.

### `package.json` engines
```json
"engines": { "node": ">=18.0.0" },
"engineStrict": true,
"volta": { "node": "18.17.1" }
```

## Lockfiles

```
sportbar-unified/
├── pnpm-lock.yaml          # Lockfile del frontend
├── server/
│   └── pnpm-lock.yaml      # Lockfile del server
```

Cada directorio tiene su propio lockfile independiente.

## Overrides del server

Express 4.x tiene vulnerabilidades en dependencias transitivas que no puede resolver automáticamente. El `package.json` del server usa `pnpm.overrides` para forzar versiones seguras de:
- `body-parser`
- `path-to-regexp`
- `qs`
- `semver`

## Comandos principales

```bash
pnpm install              # Instalar dependencias (frontend + server)
pnpm run dev              # Dev server (puerto 5173)
pnpm run dev:full         # Dev + server simultáneo
pnpm run build            # Build a dist/
pnpm run serve            # Server Express (puerto 3000)
pnpm run start            # Build + serve
pnpm run setup:auto       # Setup completo
pnpm run clean            # Limpiar node_modules frontend
pnpm run clean:all        # Limpiar frontend + server
```

## Relaciones

- [[../Configuracion/ViteProxy]] — Vite se ejecuta con pnpm
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki, sección de gestor de paquetes y versionado
