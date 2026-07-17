# Proposal: Zonas Adicionales — 10 nuevos destinos IPEX5002

## Intent

Agregar 10 decoders IPEX5002 (destinos) al modelo de dispositivos y a la UI de ruteo, permitiendo asignar fuentes de video+audio desde la app. Actualmente registrados en el Arranger pero no modelados en el frontend.

## Scope

### In Scope
- Agregar 10 decoders IPEX5002 como destinos en `estado.tvs` y UI de MatrizVideo
- Cada destino con su MAC, nombre Arranger (`join av`-compatible), y display label
- Selects individuales (patrón VWs) en nueva sección "Zonas Adicionales" de MatrizVideo
- Integración automática en `joinMultipleTVs()` — itera todas las keys de `estado.tvs`
- El audio va embebido en HDMI (no requiere rutas separadas)

### Out of Scope
- Control de volumen/mute vía Tesira (requiere configuración física del DSP)
- Nuevos presets de audio o zonas de audio adicionales
- Auto-detección de tipo vía `get status` (ya confirmado: todos IPEX5002 decoders)

## Capabilities

### New Capabilities
- `destinos-adicionales`: registro de 10 decoders IPEX5002 como destinos enrutable con display labels, MACs, y nombres Arranger para comandos `join av`

### Modified Capabilities
- `registro-dispositivos`: extender helper `getByCapability` o crear `getAllDestinations()` para exponer la lista de destinos a componentes
- `migracion-localstorage`: agregar nuevas keys de `estado.tvs` en inicialización; presets existentes heredan defaults

## Approach

**Estrategia**: seguir el patrón VWs — destinos individuales sin agrupar, cada uno con su `<Select>` de fuentes.

1. **Contexto.jsx**: agregar 10 keys a `estado.tvs` con valor inicial `"DTV1"`, usando el nombre Arranger como key (ej: `aVip-Barra-Centro: "DTV1"`). `joinMultipleTVs()` ya itera todas las keys sin cambios.

2. **MatrizVideo.jsx**: nueva sección `<div className="matriz-select-zona">` con título "Zonas Adicionales". Un `<Select>` por destino, misma estructura que VWs (`getByCapability('videoSource')` para opciones). Agregar a `initialValues` y `onSubmit` de Formik.

3. **Aside.jsx**: si es necesario mostrar estado visual de los nuevos destinos, agregar elementos condicionales. Evaluar durante implementación si el overhead visual lo justifica.

4. **Sin cambios en `dispositivos.js`**: ese archivo modela solo fuentes (encoders IPEX5001). Los destinos viven en `estado.tvs` como las 37 entradas existentes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/contexto/Contexto.jsx` | Modified | +10 keys en `estado.tvs` |
| `src/componentes/MatrizVideo.jsx` | Modified | Nueva sección "Zonas Adicionales" con 10 selects |
| `src/componentes/Aside.jsx` | Modified (opcional) | Elementos visuales para nuevos destinos |
| `localStorage (estadoApp)` | Auto | Nuevas keys persisten automáticamente vía spread en `handleChangeEstadoVideo` |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Nombre Arranger de `RACK-VIP-PANTALLABATACA` (23 chars) excede límite de 19 chars del Arranger | Medium | Verificar en `http://192.168.2.254/#/device-settings` el nombre exacto para comandos. Si está truncado, usar el nombre corto que acepte el Arranger |
| Nombre `join av` difiere de la key usada en `estado.tvs` | Medium | `joinMultipleTVs()` usa la key como `dest`. Si el Arranger espera otro nombre, agregar entry en `vwDestNames` mapping. Verificar con un comando de prueba antes de merge |
| Presets existentes no tienen las nuevas keys → valores undefined en carga de preset | Low | Al cargar un preset viejo, `estado.tvs` hace merge vía spread; las keys nuevas quedan undefined. Agregar fallback `\|\| "DTV1"` en `initialValues` de Formik |

## Rollback Plan

1. Revertir los 3 archivos modificados (Contexto.jsx, MatrizVideo.jsx, Aside.jsx)
2. `estado.tvs` sin las nuevas keys es inofensivo — `joinMultipleTVs()` simplemente no las itera
3. localStorage se limpia solo si el usuario guarda explícitamente; las keys extras no rompen nada

## Dependencies

- Acceso al Arranger (`http://192.168.2.254`) para verificar nombres de comando `join av` de cada dispositivo
- Confirmación de que los 10 dispositivos están online en el Arranger

## Success Criteria

- [ ] Los 10 decoders aparecen como selects individuales en MatrizVideo
- [ ] Se puede asignar cualquier fuente (DTV1-DTV8) a cada destino
- [ ] El comando `join av` se envía con el nombre correcto para cada destino
- [ ] `pnpm run dev` inicia sin errores
- [ ] Los presets existentes cargan sin romperse (nuevos destinos quedan en DTV1 por default)

---

## Proposal Question Round

Antes de pasar a specs, confirmar:

1. **Conteo**: La lista tiene 10 dispositivos, pero el brief dice "9". ¿Son 9 o 10? ¿Falta/quita alguno?

2. **Nombre `join av`**: Verificar en `http://192.168.2.254/#/device-settings` el nombre EXACTO que acepta el Arranger para comandos, especialmente `RACK-VIP-PANTALLABATACA` (23 chars). ¿Usa `RACK-VIP-PANTALLABAT` (19 chars) u otro?

3. **Display labels**: ¿Qué etiquetas visibles querés en la UI? Sugerencias:
   - `aVip-Barra-Centro` → "VIP Barra Centro"
   - `aVip-Lobby-Batacazo` → "VIP Lobby Batacazo"
   - `a-Menos1-Escenario` → "Escenario -1"
   - `a-QMR75-Menos1-TV1` → "QMR75 -1 TV1"
   - `aVip-Bar-Boveda` → "VIP Bar Bóveda"
   - `aMas-15-Barra` → "+15 Barra"
   - `a-QMR75-Menos1-TV2` → "QMR75 -1 TV2"
   - `a-Menos1-Escenario2` → "Escenario -1 (2)"
   - `a-QMC65-Menos1-TV2` → "QMC65 -1 TV2"
   - `RACK-VIP-PANTALLABATACA` → "Rack VIP Bataca"
   
   ¿Modificaciones?

4. **Aside visual**: ¿Necesitás indicadores visuales de estado en el Aside para estos nuevos destinos, o solo los selects en MatrizVideo?

5. **Audio zones**: Confirmado que NO se necesitan nuevas zonas de audio vía Tesira. El audio va por HDMI embebido. ¿Correcto?
