# Design: Wiki Dispositivos — Reorganización Jerárquica

## Technical Approach

Node.js migration script (`scripts/migrate-dispositivos-hierarchy.js`) idempotente de 4 fases: (1) crear estructura de directorios, (2) fusionar decodificadores, (3) mover archivos + reescribir wikilinks internos, (4) actualizar `index.md` + `AGENTS.md`. Ejecución atómica con rollback vía `git checkout`. No modifica código de aplicación ni dependencias.

## Architecture Decisions

### Decision: Execution vehicle

| Option | Tradeoff | Decision |
|--------|----------|----------|
| PowerShell script | Nativo en Windows, pero merge lógico y regex multi-línea son frágiles | ✗ |
| Node.js script | `fs`, `path`, regex engine maduro; proyecto ya usa Node (Express server) | ✓ |
| Pasos manuales | Sin dependencias, pero ~20 operaciones propensas a error humano | ✗ |

**Rationale**: La fusión de Decodificadores.md requiere lógica de secciones (extraer headings, comparar bloques, priorizar versión más larga). Node.js lo expresa en ~30 líneas con `fs.readFileSync` + parsing de headings; PowerShell necesitaría regex complejo propenso a falsos positivos.

### Decision: Merge algorithm

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Conservar solo el archivo más largo | Simple, pero pierde contenido único del otro | ✗ |
| Concatenar ambos | Rápido, pero duplica ~30% del contenido (tabla DTV1-DTV6) | ✗ |
| Merge por secciones | Detecta headings (`## X`) en ambos archivos, conserva contenido único de cada uno, prioriza versión más larga en secciones compartidas | ✓ |

**Rationale**: `Decodificadores.md` (59 líneas) tiene TVRACK, Estado visual, patrones de uso. `DirecTV-Decos.md` (72 líneas) tiene Flujo IR y Conexión física. Ninguno es superconjunto estricto. El resultado fusionado retiene 100% del contenido único + la versión más detallada de las secciones compartidas.

### Decision: Wikilink rewrite strategy

| Option | Tradeoff | Decision |
|--------|----------|----------|
| Solo index.md (~11 links) | Mínimo cumplimiento del spec, pero deja ~80 links internos rotos en los 8 archivos movidos | ✗ |
| Reescribir todos los links internos de archivos movidos a jerárquicos | Correcto, pero requiere parseo de profundidad por archivo | ✓ |

**Rationale**: Los 8 archivos que migran usan `[[../Dispositivos/X]]` y `[[X]]` (mismo directorio). Al moverse de profundidad 2 a 3, los `../` existentes apuntan un nivel incorrecto. El script aplica mapping filename→newPath sobre TODOS los wikilinks en cada archivo movido, ajustando prefijos `../` mecánicamente según la nueva profundidad.

**Mapping de wikilinks** (viejo → nuevo, absoluto):
- `Decodificadores` → `DirecTV/Decodificadores/Decodificadores`
- `DirecTV-Decos` → ELIMINADO (fusionado)
- `IPEX5001-Encoder` → `Liberty/Distribucion/IPEX5001-Encoder`
- `IPEX5002-Decoder` → `Liberty/Distribucion/IPEX5002-Decoder`
- `Arranger-IPEXCB` → `Liberty/Controladores/Arranger-IPEXCB`
- `AHM-32` → `Allen-Heath/Procesadores/AHM-32`
- `SQ6` → `Allen-Heath/Mezcladoras/SQ6`
- `Shure-ANI` → `Shure/Audio/ANI`
- `MagicInfo` → `Samsung/Software/MagicInfo`
- `ZonasAudio` → `Conceptos/ZonasAudio` (cross-type)

## Data Flow

```
Pre-flight: git status --porcelain wiki/ → ¿limpio?
    │
    ▼
Fase 1: mkdir (7 fabricantes + 9 categorías)
    │
    ▼
Fase 2: leer Decodificadores.md + DirecTV-Decos.md
         → merge por headings → escribir fusionado
         → eliminar originales
    │
    ▼
Fase 3: for each archivo movible:
         ├── copy a nueva ruta (preserva encoding UTF-8)
         ├── reescribir [[wikilinks]] según mapping + ajuste de profundidad
         └── eliminar original
    │
    ▼
Fase 4: reescribir index.md (~11 links) + crear placeholders (3 archivos)
         → actualizar AGENTS.md (3 líneas)
    │
    ▼
Post-flight: grep "\[\[Dispositivos/[A-Z]" wiki/ → cero resultados
             → ls wiki/Dispositivos/*.md → solo directorios
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `scripts/migrate-dispositivos-hierarchy.js` | Create | Script Node.js de migración (4 fases, idempotente) |
| `wiki/Dispositivos/` (7 subdirectorios) | Create | `DirecTV/Decodificadores/`, `Samsung/{Televisores,Software}/`, `Allen-Heath/{Procesadores,Mezcladoras}/`, `Liberty/{Distribucion,Controladores}/`, `Shure/Audio/`, `dbx/Procesadores/`, `Kramer/Distribucion/` |
| `wiki/Dispositivos/DirecTV/Decodificadores/Decodificadores.md` | Create | Fusión de `Decodificadores.md` + `DirecTV-Decos.md` |
| `wiki/Dispositivos/{Fabricante}/{Categoria}/*.md` (7 files) | Move | 7 archivos movidos a sus paths jerárquicos con wikilinks reescritos |
| `wiki/Dispositivos/Samsung/Televisores/DBE-DME-DHE.md` | Create | Placeholder |
| `wiki/Dispositivos/dbx/Procesadores/ZonePRO-1260.md` | Create | Placeholder |
| `wiki/Dispositivos/Kramer/Distribucion/VM-8H.md` | Create | Placeholder |
| `wiki/Conceptos/ZonasAudio.md` | Move | Migrado desde `wiki/Dispositivos/` |
| `wiki/Dispositivos/Decodificadores.md` | Delete | Fusionado en nuevo archivo |
| `wiki/Dispositivos/DirecTV-Decos.md` | Delete | Fusionado en nuevo archivo |
| `wiki/index.md` | Modify | ~11 wikilinks actualizados + sección jerárquica |
| `AGENTS.md` | Modify | L268 (naming convention), L373 (carpetas), L380+ (ejemplos de wikilinks) |

## Interfaces / Contracts

**Placeholder template** (idempotente — no sobrescribe si el archivo ya tiene > 30 bytes):

```markdown
# {DeviceName}

## Estado

Pendiente de documentación.
```

**Mapping object** (usado por el script para resolver rutas):

```js
const PATH_MAP = {
  "Decodificadores":      "DirecTV/Decodificadores/Decodificadores",
  "DirecTV-Decos":        null, // merged
  "IPEX5001-Encoder":     "Liberty/Distribucion/IPEX5001-Encoder",
  "IPEX5002-Decoder":     "Liberty/Distribucion/IPEX5002-Decoder",
  "Arranger-IPEXCB":      "Liberty/Controladores/Arranger-IPEXCB",
  "AHM-32":               "Allen-Heath/Procesadores/AHM-32",
  "SQ6":                  "Allen-Heath/Mezcladoras/SQ6",
  "Shure-ANI":            "Shure/Audio/ANI",
  "MagicInfo":            "Samsung/Software/MagicInfo",
  "ZonasAudio":           null, // cross-type → Conceptos
};
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Verification (post-flight) | Cero wikilinks planos residuales | `grep -r "\[\[Dispositivos/[A-Z]" wiki/` — esperado: 0 matches |
| Verification | No `.md` en raíz de `wiki/Dispositivos/` | `ls wiki/Dispositivos/*.md` — esperado: solo directorios |
| Verification | Placeholders existen y no vacíos | `wc -c` > 20 bytes en los 3 archivos |
| Verification | `index.md` tiene índice jerárquico | `grep "DirecTV/Decodificadores" wiki/index.md` — esperado: match |
| Verification | AGENTS.md actualizado | `grep "Fabricante}/{Categoria}" AGENTS.md` — esperado: match |
| Manual | Merge de decodificadores sin pérdida | Revisar visualmente que contenido de ambos originales está presente |

## Threat Matrix

N/A — no routing, shell, subprocess, VCS/PR automation, executable-file classification, or process-integration boundary. Change is pure filesystem reorganization of markdown documentation.

## Migration / Rollout

**Pre-flight**: `git status --porcelain wiki/` debe estar vacío. Si no, abortar.

**Rollback**: `git checkout HEAD -- wiki/Dispositivos/ wiki/Conceptos/ZonasAudio.md wiki/index.md AGENTS.md wiki/log.md`

**Idempotencia**: El script verifica existencia de directorios y archivos destino antes de cada operación. Placeholders no sobrescriben si ya tienen contenido (>30 bytes). Re-ejecutar es seguro.

## Open Questions

- [ ] ¿Conviene reescribir links internos como absolutos (`[[Dispositivos/Liberty/...]]`) o mantenerlos relativos con profundidad corregida? Los relativos son más frágiles ante futuras reorganizaciones; los absolutos son inmunes a moves pero requieren conocer la raíz del vault. **Propuesta**: usar paths relativos corregidos para mantener consistencia con el resto de la wiki.
