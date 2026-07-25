# ArrangerApi

API cliente para la comunicación con el controlador [[../Dispositivos/Arranger-IPEXCB|Arranger IPEXCB]] en `192.168.2.254`. Centraliza la construcción y envío de comandos HTTP GET en modo `no-cors` para controlar la matriz audiovisual, decodificadores, procesador de audio Tesira y periféricos IR/seriales.

Ubicación: `src/api/arrangerApi.js`

## Configuración

| Parámetro | Valor por defecto | Variable de entorno |
|-----------|-------------------|---------------------|
| Base URL | `http://192.168.2.254/api/command` | `VITE_ARRANGER_API_BASE` |
| Token | `TOKEN_REMOVED` | `VITE_ARRANGER_TOKEN` |

## Interfaces del controlador

El [[../Dispositivos/Arranger-IPEXCB|Arranger IPEXCB]] expone dos interfaces de control:

| Interfaz | Dirección | Uso en SportBar |
|----------|-----------|-----------------|
| HTTP API | `http://192.168.2.254/api/command/[cmd]/[token]` | Principal — todas las operaciones de la app |
| TCP API | Puerto `6980` | No usado directamente — disponible para sistemas de control de terceros |

## Funciones exportadas

### `sendArrangerCommand(command, options?)`
Función base. Construye la URL como:
```
${ARRANGER_BASE_URL}/${encodeURIComponent(command)}/${ARRANGER_TOKEN}
```
Envía un `fetch` con `method: "GET"`, `mode: "no-cors"`, `cache: "default"`. En modo desarrollo loguea el status.

### `assignSourceToDestination(source, destination)`
Wrapper para el comando `join av`. Construye el comando y llama a `sendArrangerCommand`.

### `assignVideoSource(source, destination)`
Wrapper para el comando `[[JoinVideo|join video]]`. Enruta solo video a un destino. Usado por [[../Componentes/MatrizVideo]] — sección TVRACK ▶ Video.

### `assignAudioSource(source, destination)`
Wrapper para el comando `[[JoinAudio|join audio]]`. Enruta solo audio a un destino. Usado por [[../Componentes/MatrizVideo]] — sección TVRACK ♪ Audio.

### `joinMultipleTVs(mappings)`
Ejecuta `assignSourceToDestination` en lotes paralelos de 8 con `Promise.allSettled` para un array de mapeos `{source, dest}`. Si un comando falla, loggea el error y continúa con el siguiente. Procesamiento ~8× más rápido que el método secuencial anterior. El Formik submit en [[../Componentes/MatrizVideo]] ahora actualiza el estado incrementalmente: cada lote de 8 TVs actualiza `handleChangeEstadoVideo` y refresca el [[../Componentes/Aside]] antes de procesar el siguiente lote.

### `sendSerialCommand(device, command)`
Envía un comando serial a un dispositivo con terminador `\x0A`. El payload se codifica como URL.
Usado por el componente [[../Componentes/Audio]] para controlar el procesador Tesira.

### `sendIrCommand(deviceId, hexCode)`
Envía un código IR hexadecimal a un dispositivo usando el comando `send ir`. Usado por `sendChannelDigits` para cambio de canal dinámico.

### `sendChannelDigits(deviceId, channel)`
Cambia el canal de un DirecTV enviando los dígitos uno por uno vía IR con 300ms de delay entre cada uno. Busca los códigos hexadecimales en `src/data/irCodes.js`. Reemplaza a `loadChannelPreset` como método principal de cambio de canal.

### `loadChannelPreset(decoNumber, channel)`
**Backup activo**. Carga un preset de canal en un decodificador: `preset load deco[decoNumber]canal[channel]`. Mantenido como fallback si `sendChannelDigits` no está disponible.

### `loadMatrixPreset(presetNumber)`
Carga un preset completo de matriz desde localStorage. Usa el comando `preset load` del Arranger con formato `preset load preset[numero]`. Aplica la configuración guardada en `estadoApp_Preset[numero]` a la matriz física.

### `getDeviceStatus(deviceId)`
Consulta el estado de un dispositivo vía el proxy Express (`/api/device/:id/status`). Retorna `{ deviceId, streams, online }`. Usado para verificar conectividad de dispositivos.

### `buildArrangerCommand(command, ...args)`
Utilidad interna para construir comandos dinámicamente.

### `fetchTvrackState()`
Obtiene el estado actual de TVRACK desde el state store del Express (`GET /api/tvrack/state`). Retorna `{ video, audio, link, lastUpdated }`.

### `setTvrackVideo(deviceId)`
Persiste la selección de video del TVRACK en el state store (`POST /api/tvrack/video`). Si `link=true`, el server sincroniza audio automáticamente.

### `setTvrackAudio(deviceId)`
Persiste la selección de audio del TVRACK en el state store (`POST /api/tvrack/audio`). Si `link=true`, el server sincroniza video automáticamente.

### `setTvrackLink(linked)`
Persiste el estado del toggle de vinculación (`POST /api/tvrack/link`).

## State Store (Express)

Endpoints de persistencia compartida entre clientes en el servidor Express:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/tvrack/state` | GET | Estado actual: `{ video, audio, link, lastUpdated }` |
| `/api/tvrack/video` | POST | Actualiza fuente de video (`{ deviceId }`) |
| `/api/tvrack/audio` | POST | Actualiza fuente de audio (`{ deviceId }`) |
| `/api/tvrack/link` | POST | Toggle de vinculación (`{ linked }`) |

Estado inicial: `{ video: "DTV1", audio: "DTV1", link: false }`. En memoria — se reinicia con el server.

## Referencia completa de comandos

### Enrutamiento de video/audio

| Comando | Descripción | Componente que lo usa |
|---------|-------------|----------------------|
| `join av [SOURCE] [DEST]` | Enruta video + audio + IR + serial | [[../Componentes/MatrizVideo]], [[../Componentes/MatrizPreset]] |
| [[JoinVideo\|join video [SOURCE] [DEST]]] | Enruta solo video | [[../Componentes/MatrizVideo]] — TVRACK ▶ Video |
| [[JoinAudio\|join audio [SOURCE] [DEST]]] | Enruta solo audio | [[../Componentes/MatrizVideo]] — TVRACK ♪ Audio |
| `unjoin [DEST]` | Desconecta destino de su fuente | (no usado actualmente) |

### Control de audio

| Comando | Descripción |
|---------|-------------|
| `mute audio [DEST]` | Silencia audio de un destino |
| `unmute audio [DEST]` | Reactiva audio de un destino |
| `volume audio [DEST] [nivel]` | Ajusta volumen de un destino |

### Presets

| Comando | Descripción | Componente que lo usa |
|---------|-------------|----------------------|
| `preset load [PRESET_NAME]` | Carga un preset guardado | [[../Componentes/Canales]] |
| `preset add [nombre] [comando]` | Crea preset nuevo | (no usado actualmente) |
| `preset delete [nombre]` | Elimina preset | (no usado actualmente) |

Ejemplo: `preset load deco1canal1603` → `preset%20load%20deco1canal1603`

### Comandos seriales

| Comando | Descripción | Componente que lo usa |
|---------|-------------|----------------------|
| `send serial [DEVICE] "[COMMAND]"` | Envía comando serial a dispositivo | [[../Componentes/Audio]] |

**Modos de feedback serial** (configurables en el Arranger, no en la app):
- **None**: sin feedback — solo envía
- **Reply**: espera cualquier respuesta
- **Contains**: espera que la respuesta contenga string específico
- **Equals**: espera que la respuesta sea exacta

**Baud rates soportados**: 2400, 4800, 9600, 19200, 38400, 57600, 115200.

Ejemplo: `send serial DTV1 "Mute1 set mute 1 true\x0A"`

### Comandos IR

| Comando | Descripción |
|---------|-------------|
| `send ir [DEVICE] [HEX-CODE]` | Envía código IR a un dispositivo |

**Formato de códigos IR**: hexadecimal (Pronto HEX o Global Cache). Los códigos IR:
- Se aprenden de controles remotos físicos con iTach IP2IR
- Se pueden importar de la base de datos cloud de Global Cache
- Se pueden ingresar manualmente
- El IR sigue la ruta de video entre [[../Dispositivos/IPEX5001-Encoder|encoder]] y [[../Dispositivos/IPEX5002-Decoder|decoder]]

### Comandos CEC

| Comando | Descripción |
|---------|-------------|
| `send cec [DEVICE] [CODE]` | Envía comando HDMI CEC (encendido/apagado display, etc.) |

### Comandos TCP y Global Cache

| Comando | Descripción |
|---------|-------------|
| `send tcp [IP] [PORT] [COMMAND]` | Envía comando TCP a dispositivo de terceros |
| `send gc [IP] [PORT] [COMMAND]` | Envía comando a dispositivo Global Cache iTach |

### Comandos de estado (`get`)

| Comando | Descripción |
|---------|-------------|
| `get status [DEVICE]` | Estado general del dispositivo |
| `get status [DEVICE] video` | Estado del stream de video |
| `get status [DEVICE] audio` | Estado del stream de audio |
| `get status [DEVICE] usb` | Estado del puerto USB |
| `get status [DEVICE] serial` | Estado del puerto serial |
| `get status [DEVICE] ir` | Estado del puerto IR |
| `get video_status` | Estado de todos los streams de video |
| `get devices all` | Lista de todos los dispositivos conectados |
| `get ver` | Versión del firmware del controlador |
| `get presets` | Lista de presets guardados |
| `get matrix_status` | Estado completo de la matriz |

Respuestas típicas: `CONNECTED`, `STOPPED`, `TIMEOUT`, `DISCONNECTED`, `OUT OF RANGE`.

## Modo no-cors

Todas las llamadas usan `mode: "no-cors"`. Esto implica que:
- El navegador envía la request pero no permite leer la respuesta
- No se puede verificar el body de la respuesta
- Los errores de red se capturan con `catch` pero no se puede distinguir éxito/fallo por status HTTP
- Es una limitación del entorno — el Arranger no configura headers CORS
- Para verificar estado se requiere acceso directo a la interfaz web o API TCP

## Relaciones

- Usado por [[../Componentes/MatrizVideo]] — comandos `join av`, [[JoinVideo|join video]], [[JoinAudio|join audio]], state store TVRACK
- Usado por [[../Componentes/MatrizPreset]] — comandos `join av` en carga de presets
- Usado por [[../Componentes/Canales]] — comandos `preset load`
- Usado por [[../Componentes/Audio]] — comandos `send serial` para Tesira
- Controla [[../Dispositivos/Decodificadores]] y [[../Dispositivos/ZonasAudio]]
- Se comunica con el [[../Dispositivos/Arranger-IPEXCB]] — controlador físico
- Opera sobre los encoders [[../Dispositivos/IPEX5001-Encoder]] y decoders [[../Dispositivos/IPEX5002-Decoder]]
- [[../Configuracion/ViteProxy]] — en desarrollo, las llamadas pasan por el proxy de Vite (:3101)
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki

## Catálogo de comandos API

Listado completo de comandos documentados del Arranger IPEX5000, agrupados por categoría, con estado de implementación en el sistema SportBar.

### Routing (join / leave)

| Comando | Descripción | Estado | Página |
|---------|-------------|--------|--------|
| [[JoinAv\|join av]] | Video + audio combinado | ✅ `assignSourceToDestination()` | [[JoinAv]] |
| [[JoinVideo\|join video]] | Solo video | ✅ `assignVideoSource()` | [[JoinVideo]] |
| [[JoinAudio\|join audio]] | Solo audio | ✅ `assignAudioSource()` | [[JoinAudio]] |
| `join ir` | Enrutamiento IR independiente | 🔲 pendiente | — |
| `join serial` | Enrutamiento serial independiente | 🔲 pendiente | — |
| `join usb` | Enrutamiento USB independiente | 🔲 pendiente | — |
| `join all` | Todas las señales combinadas | 🔲 pendiente | — |
| `join kvm` | Video + audio + USB | 🔲 pendiente | — |
| `join wall` | Configuración video wall | 🔲 pendiente | — |
| `join usb_ext` | USB Extender externo (documentado, no usado en SportBar) | 🔲 pendiente | — |
| [[LeaveAv\|leave av]] | Desconectar audio + video | 🔲 pendiente | [[LeaveAv]] |
| `leave video` | Desconectar solo video | 🔲 pendiente | — |
| `leave audio` | Desconectar solo audio | 🔲 pendiente | — |
| `leave ir` | Desconectar IR | 🔲 pendiente | — |
| `leave serial` | Desconectar serial | 🔲 pendiente | — |
| `leave usb` | Desconectar USB | 🔲 pendiente | — |
| `leave all` | Desconectar todas las señales | 🔲 pendiente | — |
| `leave kvm` | Desconectar KVM | 🔲 pendiente | — |
| `leave usb_ext` | Desconectar USB Extender (documentado, no usado en SportBar) | 🔲 pendiente | — |
| `stop` | Detener stream de encoder | 🔲 pendiente | — |
| `start` | Iniciar stream de encoder | 🔲 pendiente | — |

### Send (comandos de envío)

| Comando | Descripción | Estado | Página |
|---------|-------------|--------|--------|
| [[SendIr\|send ir]] | Enviar código infrarrojo | ✅ `sendIrCommand()` | [[SendIr]] |
| [[SendSerial\|send serial]] | Enviar datos RS-232 | ✅ `sendSerialCommand()` (con bug) | [[SendSerial]] |
| `send cec` | Enviar comando HDMI CEC genérico | 🔲 pendiente | — |
| `send cec_off` | Apagar display vía CEC (comando directo) | 🔲 pendiente | — |
| `send cec_on` | Encender display vía CEC (comando directo) | 🔲 pendiente | — |
| `send gc` | Global Cache iTach (licenciado) | 🔲 pendiente | — |
| `send tcp` | Comando TCP a dispositivo externo | 🔲 pendiente | — |

### Get (comandos de consulta)

| Comando | Descripción | Estado | Página |
|---------|-------------|--------|--------|
| [[GetStatus\|get status]] | Estado de dispositivo o stream | 🔲 pendiente | [[GetStatus]] |
| [[GetDevices\|get devices]] | Lista de dispositivos (nombre + MAC) | 🔲 pendiente | [[GetDevices]] |
| [[GetMatrix\|get matrix]] | Estado completo de la matriz por stream | ✅ `getMatrix()` | [[GetMatrix]] |
| [[GetJoins\|get joins]] | Joins activos de un decoder | ✅ `getJoins()` | [[GetJoins]] |
| `get video_status` | Estado de todos los streams de video | 🔲 pendiente | — |
| `get ver` | Versión de firmware de dispositivo | 🔲 pendiente | — |
| `get display_status` | Estado de display conectado | 🔲 pendiente | — |
| `get edid` | EDID del display conectado | 🔲 pendiente | — |
| `get video` | Información de video de encoder | 🔲 pendiente | — |
| `get audio_source` | Fuente de audio de decoder | 🔲 pendiente | — |
| `get preferred` | Resolución preferida del display | 🔲 pendiente | — |
| `get scaler` | Estado del scaler | 🔲 pendiente | — |
| `get rotation` | Rotación de video configurada | 🔲 pendiente | — |
| `get frame_converter` | Frame rate del encoder | 🔲 pendiente | — |
| `get video_mute` | Estado de mute de video | 🔲 pendiente | — |
| `get video_quality` | Calidad de video configurada | 🔲 pendiente | — |
| `get volume` | Volumen de decoder | 🔲 pendiente | — |
| `get events` | Eventos del sistema | 🔲 pendiente | — |
| `get var` | Valor de variable definida | 🔲 pendiente | — |
| `get presets` | Lista de presets guardados | 🔲 pendiente | — |

### Preset

| Comando | Descripción | Estado | Página |
|---------|-------------|--------|--------|
| `preset load` | Cargar preset guardado | ✅ `loadChannelPreset()` + `loadMatrixPreset()` | — |
| `preset add` | Crear preset nuevo | 🔲 pendiente | — |
| `preset delete` | Eliminar preset | 🔲 pendiente | — |
| `preset delay` | Agregar delay en preset | 🔲 pendiente | — |

### Set (comandos de configuración)

| Comando | Descripción | Estado | Página |
|---------|-------------|--------|--------|
| `set audio_source` | Fuente de audio de decoder | 🔲 pendiente | — |
| `set edid` | Cargar EDID en encoder | 🔲 pendiente | — |
| `set frame_converter` | Frame rate de encoder | 🔲 pendiente | — |
| `set rotation` | Rotación de video | 🔲 pendiente | — |
| `set scaler` | Modo de scaler | 🔲 pendiente | — |
| `set video_mute` | Mute de video en decoder | 🔲 pendiente | — |
| `set video_quality` | Calidad de video | 🔲 pendiente | — |
| `set volume` | Volumen de decoder | 🔲 pendiente | — |

### System

| Comando | Descripción | Estado | Página |
|---------|-------------|--------|--------|
| `reboot` | Reiniciar dispositivo(s) | 🔲 pendiente | — |
| `set events` | Configurar eventos | 🔲 pendiente | — |
| `set listener` | Configurar listener TCP (licenciado, documentado API V1.4.0.0) | 🔲 pendiente | — |
| `set var` | Definir variable de sistema | 🔲 pendiente | — |

### UI (User Interfaces — licenciado)

| Comando | Descripción | Estado |
|---------|-------------|--------|
| `set ui` | Configurar UI | 🔲 pendiente |
| `set ui_button` | Configurar botón UI | 🔲 pendiente |
| `set ui_image` | Configurar imagen UI | 🔲 pendiente |
| `set ui_indicator` | Configurar indicador UI | 🔲 pendiente |
| `set ui_label` | Configurar etiqueta UI | 🔲 pendiente |
| `set ui_page` | Configurar página UI | 🔲 pendiente |
| `set ui_redirect` | Configurar redirección UI | 🔲 pendiente |
| `set ui_revert` | Configurar revert UI | 🔲 pendiente |
| `set ui_slider` | Configurar slider UI | 🔲 pendiente |

### Notify (mensajes del sistema)

| Comando | Descripción | Estado |
|---------|-------------|--------|
| `notify serial` | Notificación de datos seriales | 🔲 pendiente |
| `notify network` | Notificación de red | 🔲 pendiente |
| `notify display` | Notificación de display | 🔲 pendiente |
| `notify source` | Notificación de fuente | 🔲 pendiente |

**Total de comandos documentados**: 67 | **Implementados**: 10 (`join av`, `join video`, `join audio`, `send ir`, `send serial`, `get devices`, `get status`, `get matrix`, `get joins`, `preset load`) — `preset load` con dos wrappers: `loadChannelPreset()` y `loadMatrixPreset()`
