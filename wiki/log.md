# Log de Cambios — Wiki SportBar Unified

Registro cronológico de todas las operaciones de la wiki: ingestas, creación de páginas, actualizaciones y mantenimiento.

---

## [2026-07-14] ingest | Fase 4 — Entidades iniciales

**Operación**: Ingesta inicial de entidades desde código fuente.

**Páginas creadas (15)**:

### Componentes React (8)
- `Componentes/MatrizVideo.md` — control principal de matriz de video, 30+ TVs, 8 decos, comandos `join av`
- `Componentes/MatrizPreset.md` — gestión de 5 presets, cargar/grabar, `handleCargaMatriz()`, `window.location.reload()`
- `Componentes/Canales.md` — gestión de canales, 20 favoritos con logos, comandos `preset load`
- `Componentes/Audio.md` — control de audio por zonas, 9 comandos `send serial` al Tesira
- `Componentes/Aside.md` — panel lateral, colores CSS, estado en tiempo real de decos/audio/video
- `Componentes/Arranger.md` — links a la UI web del Arranger IPEX5000
- `Componentes/Contexto.md` — definición de `estadoInicial`, `ContextoUser`, inicialización de presets en localStorage
- `Componentes/App.md` — componente raíz, provider, 4 handlers, persistencia en `localStorage`

### API (1)
- `API/ArrangerApi.md` — cliente HTTP, comandos `join av`, `preset load`, `send serial`, `get status`, modo `no-cors`, token `TOKEN_REMOVED`

### Dispositivos Hardware (2)
- `Dispositivos/Decodificadores.md` — DTV1–DTV8, colores CSS, canales por defecto, TVRACK
- `Dispositivos/ZonasAudio.md` — Norte/Centro/Sur, comandos Tesira, Mute/Level/SourceSelector

### Conceptos (2)
- `Conceptos/StateManagement.md` — Context API + localStorage + 4 handlers, flujo de actualización
- `Conceptos/SistemaPresets.md` — 5 keys de localStorage, flujo carga/grabación, `window.location.reload()`

### Configuración (2)
- `Configuracion/ViteProxy.md` — proxy `/api` → `192.168.2.254`, chunks vendor/router/forms/ui, dev server
- `Configuracion/PnpmSetup.md` — pnpm exclusivo, `.npmrc` (supply chain, exact versions), `.nvmrc` (Node 18.17.1), overrides del server

**Archivos raíz creados (2)**:
- `index.md` — índice de la wiki con todas las categorías del schema
- `log.md` — este archivo

**Links totales entre páginas**: ~110 [[wikilinks]] cross-referenciando entidades, README y AGENTS.

**Páginas más interconectadas**:
- `API/ArrangerApi.md` — linkeada desde 10+ páginas (todos los componentes que consumen la API y ambos dispositivos)
- `Conceptos/StateManagement.md` — linkeada desde 8 páginas (todos los componentes que usan contexto)
- `Dispositivos/Decodificadores.md` — linkeada desde 8 páginas (todos los componentes que controlan decos)

**Fuentes consultadas**:
- `src/componentes/MatrizVideo.jsx`
- `src/componentes/MatrizPreset.jsx`
- `src/componentes/Canales.jsx`
- `src/componentes/Audio.jsx`
- `src/componentes/Aside.jsx`
- `src/componentes/Arranger.jsx`
- `src/contexto/Contexto.jsx`
- `src/App.jsx`
- `src/api/arrangerApi.js`
- `vite.config.js`
- `package.json`
- `.npmrc`
- `.nvmrc`
- `API commands/get_status.txt`
- `README.md`
- `AGENTS.md`

**Sin contradicciones detectadas**.

---

## [2026-07-15] ingest | Manuales de hardware IPEX5001, IPEX5002 y Arranger IPEXCB

**Operación**: Ingesta de manuales de hardware del ecosistema Arranger Digi IP 5000.

**Fuentes consultadas**:
- Manual de instalación IPEX5001 / IPEX5002 (Liberty AV / DigitaLinx IP)
- Manual de usuario Arranger Digi IP 5000 Series / IPEXCB
- `API commands/devices_all.txt` — catálogo de dispositivos conectados
- `API commands/get_status.txt` — referencia del comando `get status`

**Páginas creadas (4)**:
- `Dispositivos/IPEX5001-Encoder.md` — especificaciones técnicas, 11 puertos documentados, IR/RS232/USB/CEC/PoE, solución de problemas, accesorios incluidos
- `Dispositivos/IPEX5002-Decoder.md` — especificaciones, 8 puertos, comparativa con encoder, funciones de display (idle image, video mute, rotación), solución de problemas
- `Dispositivos/Arranger-IPEXCB.md` — IP 192.168.2.254, token TOKEN_REMOVED, HTTP API + TCP puerto 6980, 30+ comandos documentados por categoría, reglas de nombrado, requisitos de switch
- `Dispositivos/DirecTV-Decos.md` — DTV1–DTV6 con MAC del Arranger, colores CSS, canales por defecto, flujo de control IR completo, aclaración de que DTV7/E-OBS_CS y DTV8/F-STREAMING-CS NO son DirecTV

**Páginas actualizadas (3)**:
- `Dispositivos/Decodificadores.md` — corregido de "8 decodificadores DirecTV" a "6 DirecTV + 2 encoders IPEX5001 (OBS y streaming)", agregadas MACs, referencias cruzadas a IPEX5001 y DirecTV-Decos
- `Dispositivos/ZonasAudio.md` — agregada conexión física Tesira DSP ↔ IPEX5001 DTV1 vía RS232, especificaciones RS232 del manual, cadena completa de control serial, cross-refs a IPEX5001 y Arranger-IPEXCB
- `API/ArrangerApi.md` — expandida con referencia completa de comandos: enrutamiento, audio, presets, serial (modos de feedback), IR (formato HEX), CEC, TCP, Global Cache, 10+ comandos `get`, cross-refs a IPEX5001, IPEX5002 y Arranger-IPEXCB

**Páginas actualizadas (raíz)**:
- `index.md` — agregadas 4 nuevas entradas en Dispositivos Hardware, actualizada sección Sources y Referencias de API
- `log.md` — esta entrada

**Links agregados**: ~70 nuevos [[wikilinks]] entre las 4 páginas nuevas y las 3 actualizadas. Conexiones clave: IPEX5001 ↔ IPEX5002, DirecTV-Decos ↔ IPEX5001, Arranger-IPEXCB ↔ ArrangerApi, ZonasAudio ↔ IPEX5001 (gateway serial).

**Contradicciones corregidas**: La página `Decodificadores.md` describía incorrectamente los 8 dispositivos como "decodificadores DirecTV". Corregido para reflejar que DTV7 y DTV8 son encoders IPEX5001 (`E-OBS_CS` y `F-STREAMING-CS`), no decodificadores.

**Sin contradicciones pendientes**.
