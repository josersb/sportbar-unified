# Exploración: zonas-adicionales

## Current Model Analysis

### Arquitectura en 3 capas

1. **`dispositivos.js`** — 8 fuentes de video (DTV1-DTV8), todas etiquetadas `IPEX5001`. Expone helpers: `getByCapability()`, `getDevice()`, `getAllDevices()`. Solo modela ENCODERS (fuentes). Los decoders (destinos) NO están en este archivo.

2. **`estado.tvs`** (en `Contexto.jsx`) — 37 entradas: 30 TVs individuales (TV01-TV26), 3 VWs (VWN/VWC/VWS), TVRACK, y 7 keys de grupos de zona (TvsBarraNorte, TvsEscaleraSur, etc.). Cada entrada mapea a un source ID (ej: `TV01: "DTV1"`). Las keys de grupo son controles compuestos que se expanden en switch statements hardcodeados.

3. **`estado.audio`** — Array fijo de 3 zonas (índices 0=Sur, 1=Centro, 2=Norte). Cada zona tiene `{nombreZona, fuenteAudio, volumen, mute}`.

4. **`estado.dispositivos`** — Generado automáticamente desde `DISPOSITIVOS`, contiene estado runtime (canalActual, capacidades, online).

### Cómo MatrizVideo usa el modelo

- **Source dropdowns**: `getByCapability('videoSource')` → **dinámico**. Cualquier dispositivo nuevo con esa capability aparece automáticamente en todos los selects.
- **Destinos**: NO hay dropdowns por TV individual. Se controlan por grupos (TvsBarraNorte, etc.) mediante selects con opciones compuestas hardcodeadas (DTV1234, DTV1212, etc.) + switch statements que expanden el grupo a TVs individuales.
- **VWs**: 3 selects individuales dinámicos.
- **TVRACK**: botones directos por cada fuente.
- **`joinMultipleTVs()`**: Itera sobre TODAS las entries de `estado.tvs` (37) y envía `join av {source} {dest}`. Los VWs tienen name mapping especial (`VWN` → `VW-Norte`, etc.). Las TVs usan su key como nombre directamente (`TV01`, etc.).

### Cómo Audio usa el modelo

- **Sources**: `getByCapability('audioSource')` → **dinámico**.
- **Zonas**: 3 hardcodeadas con Tesira IDs fijos:
  - Norte: `Mute1`, `Level3`, `SourceSelector1`
  - Centro: `Mute2`, `Level4`, `SourceSelector2`
  - Sur: `Mute3`, `Level5`, `SourceSelector3`
- **Gateway serial**: DTV1 es el IPEX5001 con RS232 conectado al Tesira DSP. **Crítico**: DTV1 debe permanecer online para que el audio funcione.
- Nuevas zonas de audio requerirían: nuevos Tesira Mute/Level/SourceSelector IDs + configuración física en el DSP.

### Persistencia

- `App.jsx`: `useEffect` escribe `estado` completo a `localStorage("estadoApp")` en cada cambio.
- Presets: 5 slots en localStorage (`estadoApp_Preset1` a `estadoApp_Preset5`).
- Migración v0→v1: convierte `decos[]` a `dispositivos{}`.
- Al agregar nuevas keys a `estado.tvs` o `estado.audio`, se persisten automáticamente (el spread operator preserva todas las keys). Pero los presets existentes NO tendrán las nuevas keys hasta que se guarden de nuevo.

---

## Device Type Detection

### Prefijos MAC

| Prefijo | Batch | Dispositivos | ¿Diferencia encoder/decoder? |
|---------|-------|-------------|------------------------------|
| `341B2281XX` | Original | TVs, VWs, TVRACK (decoders) + DTV1-DTV6 (encoders) | ❌ No |
| `6C930870XXXX` | Expansión | DTV7, DTV8, 11 nuevos | ❌ No |

**Conclusión**: El prefijo MAC identifica el batch/lote de fabricación, NO el tipo de hardware. El mismo prefijo contiene tanto IPEX5001 (encoders) como IPEX5002 (decoders).

### El comando `get status`

El proxy Express (`server.js` línea 31-56) hace `get status {deviceId}` al Arranger y parsea streams activos:

```javascript
const streams = {
  video: text.includes("VIDEO"),
  audio: text.includes("AUDIO"),
  ir: text.includes("IR"),
  serial: text.includes("SERIAL"),
  usb: text.includes("USB"),
};
res.json({ deviceId: id, streams, online: response.ok });
```

- **NO retorna el tipo de dispositivo** (encoder vs decoder).
- Tanto encoders como decoders reportan `video: true` cuando están conectados.
- **No es posible auto-detectar encoder vs decoder desde el comando `get status` actual.**

### Inferencias por naming convention

| Dispositivo | Nombre sugiere | Probabilidad |
|------------|---------------|-------------|
| `a-QMR75-Menos1-TV1` | Decoder → TV QMR75 | Alta |
| `a-QMR75-Menos1-TV2` | Decoder → TV QMR75 | Alta |
| `a-QMC65-Menos1-TV2` | Decoder → TV QMC65 | Alta |
| `a-Menos1-Escenario` | ¿Encoder (fuente) o Decoder (display)? | Ambiguo |
| `a-Menos1-Escenario2` | ¿Encoder (fuente) o Decoder (display)? | Ambiguo |
| `aVip-Barra-Centro` | ¿Encoder o Decoder? | Ambiguo |
| `aVip-Lobby-Batacazo` | ¿Encoder o Decoder? | Ambiguo |
| `aVip-Bar-Boveda` | ¿Encoder o Decoder? | Ambiguo |
| `aMas-15-Barra` | ¿Encoder o Decoder? | Ambiguo |
| `RACK-VIP-PANTALLABATACA` | "RACK" → ¿Encoder en rack? | Media |

### Regla de nombrado Arranger

- Máximo **19 caracteres** para nombres de dispositivo.
- `RACK-VIP-PANTALLABATACA` tiene 23 caracteres → posiblemente truncado o con nombre distinto para comandos `join av`.
- `get devices all` muestra: `{nombre}-{MAC}`. El nombre para comandos es solo la parte antes del guión-MAC.

---

## UI Expansion Plan

### Escenario A: Nuevas FUENTES (encoders) — IMPACTO BAJO

Agregar entradas a `dispositivos.js`:

```javascript
{
  id: 'AVIP-BARRA',
  hardware: 'IPEX5001',
  mac: '6C9308710BD0',
  connected: 'Fuente VIP Barra Centro',
  provider: null,
  color: '#XXXXXX',
  fallbackCapabilities: ['videoSource', 'audioSource'],
}
```

| Ventaja | Detalle |
|---------|---------|
| ✅ Cero cambios de UI | Aparecen automáticamente en TODOS los source dropdowns |
| ✅ 1 solo archivo | Solo `dispositivos.js` (~20 líneas) |
| ✅ Sin riesgo de regresión | Los componentes existentes no se tocan |

⚠️ Si son fuentes sin IR (no DirecTV), no asignar `channelControl`.

### Escenario B: Nuevos DESTINOS (decoders/TVs) — IMPACTO MEDIO

Agregar keys a `estado.tvs` en `Contexto.jsx` + nuevas secciones en UI.

Archivos a modificar:
1. `Contexto.jsx` — nuevas keys en `estado.tvs`
2. `MatrizVideo.jsx` — nuevas secciones `<Select>` (similares a VWs o grupos de zona)
3. `Aside.jsx` — nuevos elementos `<p id="...">` para mostrar estado visual
4. Posible `MatrizVideo.css` — estilos para nuevas secciones

⚠️ ~100-150 líneas en 4 archivos.

### Escenario C: Nuevas ZONAS de AUDIO — IMPACTO ALTO

Requiere configuración física del Tesira DSP (nuevos IDs) + cambios sustanciales en UI.

Archivos a modificar:
1. `Contexto.jsx` — nuevas entries en `estado.audio[]`
2. `Audio.jsx` — nuevas filas en JSX + Formik `initialValues` + `onSubmit`
3. `Aside.jsx` — nuevas filas en sección audio
4. El gateway serial sigue siendo DTV1 (no cambia)

⚠️ Requiere IDs Tesira que solo el usuario puede proveer.

### Camino más simple (recomendado)

**Fase 1**: Agregar todos los nuevos dispositivos como fuentes en `dispositivos.js`. Esto los hace disponibles como sources en la UI existente sin refactorizar nada. Los destinos nuevos se pueden mapear con nuevas keys en `estado.tvs`.

**Fase 2**: Una vez confirmado el rol físico de cada dispositivo, expandir la UI según necesidad.

---

## Files to Change (estimate)

| Archivo | Escenario A | Escenario B | Escenario C | Tipo de cambio |
|---------|:-----------:|:-----------:|:-----------:|---------------|
| `src/contexto/dispositivos.js` | ✅ 11 entries | — | — | Bajo: nuevas entries en objeto |
| `src/contexto/Contexto.jsx` | — | ✅ nuevas keys | ✅ nuevas entries | Medio: nuevas keys de estado |
| `src/componentes/MatrizVideo.jsx` | — | ✅ secciones UI | — | Alto: JSX + lógica switch |
| `src/componentes/Audio.jsx` | — | — | ✅ filas + Tesira IDs | Alto: JSX + Formik + comandos |
| `src/componentes/Aside.jsx` | — | ✅ elementos visuales | ✅ filas audio | Medio: JSX + CSS vars |
| `src/componentes/MatrizVideo.css` | — | Posible | — | Bajo: estilos |
| `src/api/arrangerApi.js` | — | Posible mapping | Posibles comandos | Bajo-Medio |

| Escenario | Líneas estimadas | Archivos | Riesgo |
|-----------|:----------------:|:--------:|:------:|
| Solo fuentes (A) | ~20 | 1 | Bajo |
| Fuentes + destinos (A+B) | ~100-150 | 4 | Medio |
| Completo (A+B+C) | ~200-300 | 5-6 | Alto |

---

## Open Questions for User

1. **Tipo de cada dispositivo**: ¿Cuáles de los 11 nuevos son encoders (fuentes HDMI → IP) y cuáles son decoders (IP → HDMI hacia una TV/pantalla)? Esto determina el approach completo.

2. **Nombres para comandos `join av`**: El Arranger lista `aVip-Barra-Centro-6C9308710BD0`. ¿El nombre para comandos es `aVip-Barra-Centro` (sin MAC)? ¿O usan otro nombre más corto? Verificar en la web del Arranger: `http://192.168.2.254/#/device-settings`

3. **Conexiones físicas de los decoders**: Si hay nuevos decoders, ¿a qué TVs/pantallas específicas se conectan? (ej: "QMR75 en Planta -1, TV1")

4. **Audio en zonas nuevas**: ¿Hay zonas de audio adicionales configuradas en el Tesira DSP? Si es así, ¿cuáles son los IDs Mute/Level/SourceSelector correspondientes? ¿O las zonas nuevas solo necesitan video?

5. **Fuentes de audio**: ¿Las nuevas fuentes (encoders) necesitan enrutamiento de audio a las zonas existentes? ¿O son solo video?

6. **Control IR/Serial**: ¿Alguna de las nuevas fuentes necesita control IR (cambio de canal) o serial (comandos de control)? Esto determina qué capabilities asignarles.

7. **DTV1 como gateway serial**: ¿El Tesira DSP sigue conectado al mismo puerto RS232 del encoder DTV1? Confirmar que no se movió a otro dispositivo.

8. **Nombres visibles en UI**: ¿Qué etiquetas legibles querés para cada dispositivo nuevo? (ej: en vez de `aVip-Barra-Centro` → "VIP Barra Centro", `a-Menos1-Escenario` → "Escenario -1")
