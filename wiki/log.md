# Log de Cambios — Wiki SportBar Unified

Registro cronológico de todas las operaciones de la wiki: ingestas, creación de páginas, actualizaciones y mantenimiento.

---

## [2026-07-25] feat | Presets compartidos + UI MatrizPreset

**Operación**: Fase 3 del plan multi-dispositivo. Endpoints REST para presets, UI rediseñada, sincronización servidor↔localStorage.

**Cambios**:
- Express: `GET/POST/DELETE /api/presets/:n` con lowdb en `state.json` (key `presets`)
- `usePreset.save()` ahora async → persiste a servidor + localStorage
- `usePreset.load()` → servidor primero, localStorage fallback
- `MatrizPreset.jsx` rediseñado: 5 cards con estado usado/libre, botones Cargar/Guardar/Limpiar
- Eliminada auto-inicialización de presets en `Contexto.jsx`
- Agregada ruta `/presets` en Body.jsx + pestaña "Presets Guardados" en Nav.jsx
- Vite proxy: `/api/presets` → Express :3101

**Archivos**: server.js, MatrizPreset.jsx, MatrizPreset.module.css, MatrizPreset.test.jsx, usePreset.js, Contexto.jsx, Nav.jsx, Body.jsx, vite.config.js

## [2026-07-25] fix | Issue 7 — Performance y estado incremental

**Operación**: Corrección del Issue 7 completo (TVRACK independiente + llamadas paralelas + Aside incremental + presets de matriz).

**Cambios**:
- 7a: TVRACK excluido del Formik onSubmit — ya no es pisado por "Enviar"
- 7b: `joinMultipleTVs` paralelizado en lotes de 8 con `Promise.allSettled` (~8x más rápido)
- 7c: onSubmit actualiza `handleChangeEstadoVideo` incrementalmente (cada lote refresca el Aside)
- 7d: Nueva función `loadMatrixPreset()` para cargar configuraciones completas con `preset load`

**Archivos modificados**: MatrizVideo.jsx, arrangerApi.js, MatrizVideo.test.jsx, arrangerApi.test.js
**Tests**: 83/83

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
- `Configuracion/ViteProxy.md` — proxy `/api` → ARRANGER_HOST (configurable en `.env`, default `192.168.2.254`), chunks vendor/router/forms/ui, dev server
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
- `Dispositivos/Arranger-IPEXCB.md` — IP ARRANGER_HOST (configurable en `.env`, default `192.168.2.254`), token TOKEN_REMOVED, HTTP API + TCP puerto 6980, 30+ comandos documentados por categoría, reglas de nombrado, requisitos de switch
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

---

## [2026-07-22] ingest | Comandos Arranger `join video` y `join audio`

**Operación**: Documentación de los comandos de enrutamiento independiente de video y audio del Arranger IPEXCB.

**Fuente**: Arranger API GUIDE V1.4.0.0 — secciones 4.1 (join video) y 4.2 (join audio).

**Páginas creadas (2)**:
- `API/JoinVideo.md` — sintaxis completa, 8 argumentos (encoder, decoder, group, all, exclusive, original, auto, size), 7 modos de video, 11 códigos de error, 8 ejemplos, implementación en `assignVideoSource()`
- `API/JoinAudio.md` — sintaxis, 5 argumentos (encoder, decoder, group, all, exclusive), 8 códigos de error, 6 ejemplos, implementación en `assignAudioSource()`

**Páginas actualizadas (2)**:
- `API/ArrangerApi.md` — comandos `join video` y `join audio` pasaron de "(no usado actualmente)" a documentados con [[wikilinks]] a sus páginas dedicadas, vinculados a [[../Componentes/MatrizVideo]] sección TVRACK
- `index.md` — agregadas entradas para `API/JoinVideo` y `API/JoinAudio` en sección APIs y Endpoints

**Links agregados**: 12 nuevos [[wikilinks]]. Conexiones clave: JoinVideo ↔ JoinAudio (comandos complementarios), ambos → ArrangerApi (wrapper functions), ambos → MatrizVideo (uso en UI), ambos → Arranger-IPEXCB (controlador físico).

**Sin contradicciones detectadas**.

---

## [2026-07-22] update | Rediseño TVRACK — Video/Audio split, BrawlStarsButton, State Store

**Operación**: Actualización masiva de documentación reflejando cambios implementados en sesión 2026-07-22.

**Cambios implementados**:
- **TVRACK Video/Audio split**: Separación en dos sub-secciones con `join video`/`join audio`, toggle 🔗 de vinculación
- **BrawlStarsButton**: Componente personalizado estilo Brawl Stars (Lilita One, capibara SVG, glow neón), reducido al 50% (130×38px)
- **State Store Express**: Endpoints `/api/tvrack/*` para persistencia compartida entre clientes
- **Grid layout Aside**: Restaurado grid-template-areas 5×6 con TVRACK centrado en "Estado del video"
- **Zonas Adicionales**: Renombradas a "ZONAS FUERA DE SPORTBAR", reordenadas
- **Puerto 3101**: Nuevo entorno aislado del legacy :3000. Scripts `sportbar:dev` y `sportbar:build`
- **CSP**: Agregados Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`) para Lilita One
- **CORS**: Agregados `localhost:3101` y `127.0.0.1:3101`

**Páginas actualizadas (4)**:
- `Componentes/MatrizVideo.md` — reescrito: TVRACK split, BrawlStarsButton, state store, Zonas Fuera de Sportbar
- `API/ArrangerApi.md` — 6 funciones nuevas, state store endpoints, relaciones actualizadas
- `Configuracion/ViteProxy.md` — proxy a :3101, rutas específicas, scripts sportbar
- `log.md` — esta entrada

**Archivos código modificados (8)**: `server/server.js`, `src/api/arrangerApi.js`, `src/componentes/MatrizVideo.jsx`, `src/componentes/MatrizVideo.module.css`, `src/componentes/Aside.module.css`, `src/componentes/MatrizVideo.test.jsx`, `vite.config.js`, `package.json`

**Archivos código creados (2)**: `src/componentes/ui/BrawlStarsButton.jsx`, `src/componentes/ui/BrawlStarsButton.module.css`

**Links agregados**: ~20 nuevos wikilinks.

**Sin contradicciones detectadas**.

---

## [2026-07-25] ingest | Documentados 8 nuevos comandos API desde manuales PDF

**Operación**: Documentación completa de 8 comandos del Arranger IPEX5000 desde la API Guide V1.4.0.0, con implementación del catálogo completo de 67 comandos en ArrangerApi.md.

**Fuente**: `Docs/manuals/extracted/Arranger_DigiIP_5000_API.md` — API GUIDE V1.4.0.0 (4633 líneas).

**Páginas creadas (8)**:
- `API/GetStatus.md` — comando `get status`: estado de dispositivo/stream, 5 estados, 9 ejemplos, sin implementar
- `API/GetDevices.md` — comando `get devices`: nombre + MAC de dispositivos, 5 targets, sin implementar
- `API/GetMatrix.md` — comando `get matrix`: estado completo de matriz por stream, 6 tipos de stream, alto valor para validación, sin implementar
- `API/GetJoins.md` — comando `get joins`: encoder suscrito a decoder por tipo, 6 suscripciones, sin implementar
- `API/LeaveAv.md` — comando `leave av`: desconectar audio+video de decoder, sin implementar; aclaración de que `unjoin` no existe en la API documentada
- `API/SendIr.md` — comando `send ir`: códigos infrarrojos Pronto HEX, implementado como `sendIrCommand()`, edge case del dígito 2 documentado
- `API/SendSerial.md` — comando `send serial`: RS-232 a dispositivos, implementado como `sendSerialCommand()`; **BUG documentado**: envía `\\x0A` literal en vez del byte LF `\x0A`
- `API/JoinAv.md` — comando `join av`: video+audio combinado, implementado como `assignSourceToDestination()`, 7 modos de video, 11 códigos de error

**Páginas actualizadas (3)**:
- `API/ArrangerApi.md` — agregada sección "Catálogo de comandos API" con los 67 comandos documentados agrupados en 7 categorías (Routing, Send, Get, Preset, Set, System, UI, Notify), cada uno con estado de implementación (✅/🔲) y wikilinks a páginas dedicadas
- `index.md` — agregadas 8 nuevas entradas en APIs y Endpoints, reorganizada la sección con todas las páginas de comandos
- `log.md` — esta entrada

**Links agregados**: ~50 nuevos [[wikilinks]] entre las 8 páginas nuevas, ArrangerApi, dispositivos y componentes.

**Hallazgos técnicos**:
- El comando `unjoin` mencionado en versiones anteriores de la documentación del proyecto NO existe en la API oficial. El comando correcto es `leave av` (o `leave video`, `leave audio`, etc.).
- Bug en `sendSerialCommand()` (`arrangerApi.js:114`): `\\x0A` es un string literal de 4 caracteres, no el byte LF. Debería ser `\x0A`.
- `get matrix` es el comando de mayor valor no implementado: permitiría validar el estado completo de 40+ conexiones en una sola llamada.
- Los comandos `get devices`, `get status`, `get joins` y `get matrix` cubren el 100% de las necesidades de telemetría y validación de estado de la matriz.

**Sin contradicciones detectadas**.

---

## [2026-07-25] ingest | Hallazgos del análisis completo de manuales Arranger/IPEX — Preset Logic, Error Handling, Event Flow

**Operación**: Documentación de hallazgos del análisis completo de la API del Arranger IPEX5000 V1.4.0.0 y especificaciones del IPEX5002, con creación de páginas de concepto, actualización de comandos implementados y referencias HTTP.

**Fuentes consultadas**:
- Arranger API GUIDE V1.4.0.0 — secciones de lógica de presets, operadores, errores, y notificaciones
- Manual de usuario Arranger Digi IP 5000 Series / IPEXCB — especificaciones HTTP GET/POST, ejemplos AJAX
- Manual de instalación IPEX5002 — especificaciones RS232, PoE, DIP switch, resoluciones, latencia
- `src/api/arrangerApi.js` — verificación de implementación actual de errores y comandos `get`

**Páginas creadas (4)**:
- `Conceptos/ArrangerPresetLogic.md` — lógica condicional del Arranger: operadores básicos (`if/else`, `==`, `!=`, `<`, `>`, `!`) y avanzados V1.4.0.0 (`elseif`, `&&`, `||`, `substr()`, `instr()`, `trim()`, `inc()`, `dec()`, `&`). Comandos clasificados por tipo de retorno (string, entero, booleano). Variables de preset (`<<button_name>>`, `<<slider_value>>`, `<<ui_name>>`). Patrones de respuesta serial/tcp/gc (None, Reply, Contains, Equals). 4 ejemplos de presets del manual.
- `Conceptos/APIErrorHandling.md` — catálogo de errores: formato `error [tipo]`. Errores generales (incomplete, invalid arguments, invalid license, security key mismatch), de routing (invalid stream, join not permitted, join failed, device disconnected), de consulta (invalid subscription, device not found), de envío, configuración y presets. Análisis del manejo actual en `sendArrangerCommand()` (detección por keyword, sin tipificación, sin retry). Limitaciones del histórico `no-cors`. 4 recomendaciones de mejora priorizadas.
- `Conceptos/ArrangerEventFlow.md` — arquitectura de notificaciones push TCP puerto 6980. 4 tipos: `notify serial`, `notify network`, `notify display`, `notify source`. 3 escenarios de integración para SportBar (Aside en tiempo real, monitoreo de conectividad, validación de comandos). Limitaciones actuales (sin WebSocket, sin filtrado, licencia requerida para `set events`).
- `API/ArrangerHttpExamples.md` — formatos HTTP GET/POST, 5 ejemplos GET (join av, get matrix, send serial, preset load, key inline), formato POST JSON con ventajas/desventajas, 2 ubicaciones de security key (path vs inline), ejemplos AJAX (jQuery) y fetch (vanilla JS). Rol del proxy Express.

**Páginas actualizadas (5)**:
- `API/GetMatrix.md` — agregado formato de respuesta JSON con ejemplo (`{"Decoder1":"Encoder1","Decoder2":"null",...}`), tabla de tipos de stream, ejemplo de respuesta real, marcado como ✅ implementado (`getMatrix()` en `arrangerApi.js:99`), cross-link a ArrangerPresetLogic
- `API/GetJoins.md` — agregado formato de respuesta JSON (`{"Decoder1":"Encoder1"}`), tabla de suscripciones, ejemplo de respuesta real, marcado como ✅ implementado (`getJoins()` en `arrangerApi.js:103`), cross-link a APIErrorHandling
- `API/ArrangerApi.md` — comandos `get matrix` y `get joins` pasaron de 🔲 pendiente a ✅ implementado. Conteo de implementados actualizado de 5 a 9. Comandos `send cec_on`/`send cec_off` mejor documentados. `join usb_ext`/`leave usb_ext` marcados como documentados. `set listener` documentado como V1.4.0.0.
- `Dispositivos/IPEX5002-Decoder.md` — agregadas especificaciones RS232 (baud rates 2400–115200, modos Control vs Matrix, switch físico), tabla de resoluciones soportadas (10 entradas), latencia 17-33ms, PoE 802.3af Alternative B 6W, tabla de DIP switch (ID 0–15), codificación JPEG2000 VBR. Cross-links a SendSerial, GetMatrix, GetJoins, GetStatus.
- `index.md` — descripción de ArrangerApi actualizada con nuevos comandos implementados. Agregadas entradas para ArrangerHttpExamples, ArrangerPresetLogic, APIErrorHandling, ArrangerEventFlow en Conceptos y APIs.
- `log.md` — esta entrada

**Links agregados**: ~40 nuevos [[wikilinks]] entre las 8 páginas creadas/actualizadas y las páginas existentes de API, Conceptos, Dispositivos y Configuración.

**Hallazgos técnicos**:
- La lógica de presets del Arranger es Turing-completa para automatización: condiciones anidadas, variables, operadores de string, y patrones de respuesta serial. SportBar solo usa `preset load` para cambio de canal — hay potencial sin explotar para routing condicional.
- El manejo de errores actual (`sendArrangerCommand()`) detecta errores por substring pero no los tipifica. Todos los errores se tratan igual, sin distinción entre "device disconnected" (transitorio, requiere retry) y "invalid arguments" (permanente, requiere fix).
- Las notificaciones TCP (`notify source`) son la pieza faltante para un Aside verdaderamente reactivo. Sin embargo, el servidor Express no tiene implementación WebSocket, lo que impide el push al cliente React.
- La latencia del IPEX5002 (17-33ms) es de 1-2 frames a 60Hz — irrelevante para el caso de uso de sport bar (TVs mirando deportes), pero crítico para aplicaciones de gaming o video wall sincronizado.

**Sin contradicciones detectadas**.

---

## [2026-07-27] migration | Jerarquía Fabricante → Categoría

**Operación**: Migración de `wiki/Dispositivos/` de estructura plana a jerarquía Fabricante → Categoría.

**Cambios**:
- Creadas 10 carpetas (7 fabricantes)
- Fusionados `Decodificadores.md` + `DirecTV-Decos.md` → `DirecTV/Decodificadores/Decodificadores.md`
- Migrados 7 archivos a paths jerárquicos con wikilinks reescritos: IPEX5001-Encoder.md, IPEX5002-Decoder.md, Arranger-IPEXCB.md, AHM-32.md, SQ6.md, Shure-ANI.md, MagicInfo.md
- Migrado `ZonasAudio.md` → `Conceptos/ZonasAudio.md` (cross-type)
- Creados 3 placeholders: Samsung/Televisores/DBE-DME-DHE.md, dbx/Procesadores/ZonePRO-1260.md, Kramer/Distribucion/VM-8H.md
- Actualizados `index.md`, `AGENTS.md`, y este archivo

**Archivos**: scripts/migrate-dispositivos-hierarchy.js, wiki/ (11 dirs, 8 movidos, 3 placeholders, 2 eliminados)
**Script**: `scripts/migrate-dispositivos-hierarchy.js`
