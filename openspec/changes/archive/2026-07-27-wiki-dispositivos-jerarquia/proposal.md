# Proposal: Reorganizar Dispositivos con Jerarquía Fabricante → Categoría

## Intent

La wiki tiene 10 archivos planos en `wiki/Dispositivos/` sin agrupación por fabricante ni categoría. A medida que crece el inventario (30+ TVs Samsung, dbx, Kramer), la estructura plana no escala: navegar entre dispositivos relacionados es confuso y mantener consistencia se vuelve frágil. Esta reorganización introduce jerarquía **Fabricante → Categoría → Dispositivo**, reflejando cómo se organiza el hardware real en el rack.

## Scope

### In Scope
- Crear carpetas para 7 fabricantes y 9 categorías bajo `wiki/Dispositivos/`
- Migrar 8 archivos existentes a sus nuevas ubicaciones jerárquicas
- Fusionar `Decodificadores.md` + `DirecTV-Decos.md` → `DirecTV/Decodificadores/Decodificadores.md` (deduplicar, priorizar versión más completa)
- Renombrar `Shure-ANI.md` → `Shure/Audio/ANI.md`
- Mover `ZonasAudio.md` → `wiki/Conceptos/ZonasAudio.md`
- Crear 3 placeholders: `DBE-DME-DHE.md`, `ZonePRO-1260.md`, `VM-8H.md`
- Actualizar ~11 wikilinks en `wiki/index.md` preservando alias (`|display text`)
- Actualizar `AGENTS.md` sección LLM Wiki Schema con la nueva convención de subcarpetas
- Registrar cambio en `wiki/log.md`

### Out of Scope
- Contenido de los 3 archivos placeholder (change separado)
- Reindexado completo de la wiki (lint posterior detectará huérfanos)
- Wikilinks desde/hacia páginas fuera de `wiki/Dispositivos/` que no sean `index.md`

## Capabilities

### New Capabilities
None — cambio estructural de documentación, sin impacto en código.

### Modified Capabilities
None.

## Approach

1. **Crear estructura**: 7 fabricantes × 9 categorías mediante `mkdir` según árbol definido
2. **Migrar archivos**: mover cada `.md` a su nueva ruta; `Shure-ANI.md` → `Shure/Audio/ANI.md`
3. **Fusionar decodificadores**: leer ambos archivos, consolidar deduplicando (priorizando contenido más detallado), escribir resultado, eliminar originales
4. **Crear placeholders**: 3 archivos con `# Nombre` y sección `## Estado: Pendiente de documentación`
5. **Actualizar wikilinks**: `grep` para `[[Dispositivos/` en toda la wiki, reemplazar cada path viejo por el nuevo preservando `|alias`
6. **Actualizar schema**: modificar `AGENTS.md` → naming convention para `Dispositivos/{Fabricante}/{Categoria}/Dispositivo.md`
7. **Registrar en log.md**: entrada con fecha, resumen, lista de archivos migrados

## Affected Areas

| Area | Impact | Descripción |
|------|--------|-------------|
| `wiki/Dispositivos/` | Reorganizado | Plano → 7 fabricantes, 9 categorías |
| `wiki/Conceptos/` | +1 archivo | `ZonasAudio.md` migrado |
| `wiki/index.md` | Modificado | ~11 wikilinks + índice jerárquico |
| `AGENTS.md` | Modificado | Schema actualizado |
| `wiki/log.md` | Modificado | Nueva entrada de migración |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Wikilinks rotos por paths incorrectos | Media | `grep` post-migración: `[[Dispositivos/[A-Z]` sin Fabricante/Categoría = roto |
| Pérdida de contenido en fusión | Baja | Backup de ambos originales antes de fusionar |
| Conflicto con `feat/ahm-integration` | Baja | Este change solo toca `wiki/` — sin solapamiento |

## Rollback Plan

```bash
git checkout HEAD -- wiki/Dispositivos/
rm wiki/Conceptos/ZonasAudio.md
git checkout HEAD -- wiki/index.md AGENTS.md wiki/log.md
```

## Dependencies

Ninguna — cambio auto-contenido en `wiki/`.

## Success Criteria

- [ ] 8 archivos migrados existen en sus nuevas rutas (sin duplicados en raíz de `Dispositivos/`)
- [ ] `Decodificadores.md` fusionado contiene toda la información de ambos originales sin duplicados
- [ ] `ZonasAudio.md` existe en `wiki/Conceptos/` y NO en `wiki/Dispositivos/`
- [ ] 3 placeholders existen con metadata mínima
- [ ] `grep -r "\[\[Dispositivos/[A-Z]" wiki/` no encuentra wikilinks planos residuales
- [ ] `wiki/index.md` muestra índice jerárquico por Fabricante > Categoría > Dispositivo
- [ ] `AGENTS.md` documenta convención `Dispositivos/{Fabricante}/{Categoria}/Dispositivo.md`
- [ ] Entrada registrada en `wiki/log.md` con fecha y resumen del cambio
