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

### `joinMultipleTVs(mappings)`
Ejecuta `assignSourceToDestination` secuencialmente para un array de mapeos `{source, dest}`. Si un comando falla, loggea el error y continúa con el siguiente.

### `sendSerialCommand(device, command)`
Envía un comando serial a un dispositivo con terminador `\x0A`. El payload se codifica como URL.
Usado por el componente [[../Componentes/Audio]] para controlar el procesador Tesira.

### `loadChannelPreset(decoNumber, channel)`
Carga un preset de canal en un decodificador: `preset load deco[decoNumber]canal[channel]`.

### `buildArrangerCommand(command, ...args)`
Utilidad para construir comandos dinámicamente. Aplana arrays anidados recursivamente y une con espacios.

### `ARRANGER_API_CONFIG`
Objeto exportado con `{ baseUrl, token }` para uso en otros módulos.

## Referencia completa de comandos

### Enrutamiento de video/audio

| Comando | Descripción | Componente que lo usa |
|---------|-------------|----------------------|
| `join av [SOURCE] [DEST]` | Enruta video + audio + IR + serial | [[../Componentes/MatrizVideo]], [[../Componentes/MatrizPreset]] |
| `join video [SOURCE] [DEST]` | Enruta solo video | (no usado actualmente) |
| `join audio [SOURCE] [DEST]` | Enruta solo audio | (no usado actualmente) |
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

- Usado por [[../Componentes/MatrizVideo]] — comandos `join av`
- Usado por [[../Componentes/MatrizPreset]] — comandos `join av` en carga de presets
- Usado por [[../Componentes/Canales]] — comandos `preset load`
- Usado por [[../Componentes/Audio]] — comandos `send serial` para Tesira
- Controla [[../Dispositivos/Decodificadores]] y [[../Dispositivos/ZonasAudio]]
- Se comunica con el [[../Dispositivos/Arranger-IPEXCB]] — controlador físico
- Opera sobre los encoders [[../Dispositivos/IPEX5001-Encoder]] y decoders [[../Dispositivos/IPEX5002-Decoder]]
- [[../Configuracion/ViteProxy]] — en desarrollo, las llamadas pasan por el proxy de Vite
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
