# Propuesta: Modelo de Dispositivos por Capacidades

## Intención

La aplicación modela 8 dispositivos como un array plano de decodificadores idénticos (`estado.decos[]`), cuando en realidad son tres tipos de hardware: 6 decos DirecTV con control IR (DTV1-DTV6), un encoder OBS (DTV7), y un dispositivo de streaming (DTV8). Esto provoca fallas silenciosas cuando la UI ofrece cambio de canal para DTV7/DTV8 (sin IR). Un modelo basado en capacidades (`canChangeChannel`, `isVideoSource`) permite que la UI se comporte correctamente según el hardware real y admite nuevos tipos de dispositivo sin refactorizar componentes.

## Alcance

### Incluido
- Registro tipado de dispositivos (`src/contexto/dispositivos.js`) con `hardware`, `capacidades[]`, y metadata
- Renderizado de UI gobernado por capacidades (dropdowns dinámicos, handlers generados)
- Versionado de localStorage (`estadoApp_version`) con migración automática v0→v1
- Actualización de 8 componentes (Canales, MatrizVideo, MatrizPreset, Aside, Aside.css, Audio, Contexto, App) + 4 archivos de test

### Excluido
- Implementación de `send ir` dinámico (seguir con presets por ahora)
- Nuevos tipos de dispositivo más allá de los 3 actuales
- Refactor de zonas de audio
- Cambios en Arranger API (`arrangerApi.js` sin cambios)

## Capacidades

### Nuevas Capacidades
- `registro-dispositivos`: Definición tipada de dispositivos con `id`, `hardware`, `capacidades[]`, `conectado`, `mac`. Reemplaza el array `decos` como fuente de verdad para qué existe y qué puede hacer cada dispositivo.
- `migracion-localstorage`: Clave `estadoApp_version` y función `migrarEstado(v0→v1)` que convierte `estado.decos[]` al nuevo `estado.dispositivos` sin perder canales ni presets.

### Capacidades Modificadas
- `arranger-api-centralized`: Las secciones de MatrizVideo (handlers DTV), Canales (submitCanal), y Audio (fuenteAudio) deben actualizar sus escenarios para reflejar búsqueda por capacidades en vez de índices fijos.

## Enfoque

Patrón **Typed Device Registry**: `dispositivos.js` define cada dispositivo como `{ id, hardware, capacidades, conectado, mac }`. El estado mantiene `estado.dispositivos` como registro (objeto con keys DTV1..DTV8) y `estado.decos` temporalmente para migración. Componentes consultan `dispositivos[id].capacidades.includes("canChangeChannel")` en vez de hardcodear DTV1-DTV8. localStorage agrega `estadoApp_version: 1`; al cargar, si versión es 0 o ausente, `migrarEstado()` convierte el array viejo al nuevo registro con fallback a `estadoInicial`.

## Áreas Afectadas

| Archivo | Impacto | Cambio |
|---------|---------|--------|
| `src/contexto/dispositivos.js` | Nuevo | Registro tipado de 8 dispositivos |
| `src/contexto/Contexto.jsx` | Modificado | `estadoInicial` con `dispositivos` + `decos` legacy |
| `src/App.jsx` | Modificado | Migración localStorage v0→v1 |
| `src/componentes/Canales.jsx` | Modificado | Dropdown dinámico por capacidades |
| `src/componentes/MatrizVideo.jsx` | Modificado | Handlers generados con `map()`, no 8 funciones copiadas |
| `src/componentes/MatrizPreset.jsx` | Modificado | Lectura de presets con nuevo modelo |
| `src/componentes/Aside.jsx` | Modificado | Renderizado por tipo de dispositivo |
| `src/componentes/Aside.css` | Modificado | Colores por tipo, no por posición |
| `src/componentes/Audio.jsx` | Modificado | Fuentes de audio filtradas por capacidad |
| Tests (4 archivos) | Modificado | Actualizar assertions al nuevo modelo |

## Riesgos

| Riesgo | Probabilidad | Mitigación |
|--------|-------------|------------|
| Migración localStorage corrupta | Media | `estadoApp_version` + fallback a `estadoInicial` si migración falla |
| Pérdida de presets existentes | Baja | Migración maneja los 6 keys de localStorage, preserva `tvs` y `audio` intactos |
| Quiebre de tests (4/6 archivos) | Alta | Actualizar incrementalmente luego del código |
| DTV1 como gateway serial no debe renombrarse | Baja | Documentado: `sendSerialCommand("DTV1",...)` usa "DTV1" como puerto RS-232 del Tesira, no como deco |

## Plan de Rollback

Revertir commit. La migración es de solo lectura (no sobrescribe `estadoApp` hasta que el usuario guarda). Si la app se revierte antes de guardar, los datos viejos permanecen intactos.

## Dependencias

Ninguna externa. JavaScript vanilla + React 18 existente.

## Criterios de Éxito

- [ ] DTV7 y DTV8 no aparecen en el dropdown de cambio de canal
- [ ] Dropdown de Canales.jsx se construye dinámicamente desde `dispositivos[].capacidades`
- [ ] Handlers de MatrizVideo.jsx se generan con `map()`, no 8 funciones copiadas
- [ ] Datos existentes en localStorage migran sin pérdida (canales, presets, tvs, audio)
- [ ] Los 4 archivos de test pasan (actualizados al nuevo modelo)
- [ ] Agregar un nuevo tipo de dispositivo requiere solo una entrada en `dispositivos.js`
