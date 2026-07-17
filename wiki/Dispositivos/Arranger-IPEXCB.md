# Arranger IPEXCB

Controlador central del sistema **Arranger Digi IP 5000 Series** de Liberty AV / DigitaLinx IP. Orquesta la comunicación entre encoders [[IPEX5001-Encoder]], decoders [[IPEX5002-Decoder]] y sistemas de control de terceros. Es el cerebro de la matriz audiovisual del SportBar.

## Datos de la instalación

| Parámetro | Valor |
|-----------|-------|
| Modelo | IPEXCB (Arranger Controller) |
| Dirección IP | `192.168.2.254` |
| API Token | `TOKEN_REMOVED` |
| Interfaz web | `http://192.168.2.254` |
| API HTTP | `http://192.168.2.254/api/command/[comando]/[token]` |
| API TCP | Puerto `6980` (control de terceros) |

## API HTTP

### Formato de solicitud
```
GET http://192.168.2.254/api/command/[comando_codificado]/[token]
```

El comando debe estar URL-encoded. El `[token]` de la instalación es `TOKEN_REMOVED`.

### Método de envío
Todas las llamadas desde la aplicación SportBar usan `mode: "no-cors"`. Esto implica que el navegador envía la solicitud pero no puede leer la respuesta. Para verificar estado se requiere usar la API TCP o la interfaz web directamente.

## API TCP

El controlador escucha en el puerto `6980` para conexiones TCP de sistemas de control de terceros (Crestron, AMX, Control4, etc.). Los comandos son los mismos que la API HTTP pero sin el token en la URL.

## Referencia de comandos

### Video — Enrutamiento

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `join av [fuente] [destino]` | Enruta video + audio + IR + serial | `join av DTV1 TV01` |
| `join video [fuente] [destino]` | Enruta solo video | `join video DTV1 TV01` |
| `join audio [fuente] [destino]` | Enruta solo audio | `join audio DTV1 ZonaNorte` |
| `unjoin [destino]` | Desconecta un destino de su fuente | `unjoin TV01` |

### Audio

| Comando | Descripción |
|---------|-------------|
| `mute audio [destino]` | Silencia el audio de un destino |
| `unmute audio [destino]` | Reactiva el audio de un destino |
| `volume audio [destino] [nivel]` | Ajusta volumen de un destino |

### IR — Infrarrojo

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `send ir [dispositivo] [código-hex]` | Envía código IR a un dispositivo vía puerto IR del IPEX | `send ir DTV1 0000 006D 0022 0002` |

**Formato de códigos IR**: hexadecimal (formato Pronto HEX o Global Cache). Pueden ser:
- Aprendidos de controles remotos físicos con iTach IP2IR
- Importados desde la base de datos cloud de Global Cache (requiere internet)
- Ingresados manualmente

El parámetro `[dispositivo]` es el nombre del dispositivo en el Arranger, NO una IP. El IR sigue la ruta de video automáticamente entre [[IPEX5001-Encoder]] e [[IPEX5002-Decoder]].

### RS232 — Serial

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `send serial [dispositivo] [datos]` | Envía datos seriales a un dispositivo | `send serial DTV1 "Mute1 set mute 1 true\x0A"` |

**Modos de feedback** (respuesta del dispositivo serial):

| Modo | Comportamiento |
|------|---------------|
| None | Sin feedback — solo envía, no espera respuesta |
| Reply | Espera cualquier respuesta del dispositivo |
| Contains | Espera que la respuesta contenga un string específico |
| Equals | Espera que la respuesta sea exactamente igual a un string |

**Formato de datos**: ASCII o hexadecimal. En SportBar se usa ASCII con terminador `\x0A` (newline).

**Baud rates soportados**: 2400, 4800, 9600, 19200, 38400, 57600, 115200.

### CEC — HDMI Consumer Electronics Control

| Comando | Descripción |
|---------|-------------|
| `send cec [dispositivo] [código]` | Envía comando HDMI CEC a un dispositivo |

Permite encender/apagar displays, cambiar fuente HDMI, y otras funciones CEC estándar.

### Presets

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `preset load [nombre]` | Carga un preset guardado | `preset load deco1canal1603` |
| `preset add [nombre] [comando]` | Crea un preset nuevo con un comando | `preset add tv01dtv1 join av DTV1 TV01` |
| `preset delete [nombre]` | Elimina un preset existente | `preset delete tv01dtv1` |

### TCP — Control de terceros

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `send tcp [ip] [puerto] [comando]` | Envía comando TCP a dispositivo de terceros | `send tcp 192.168.1.100 23 power on` |

### Global Cache

| Comando | Descripción | Ejemplo |
|---------|-------------|---------|
| `send gc [ip] [puerto] [comando]` | Envía comando a dispositivo Global Cache iTach | `send gc 192.168.1.200 4998 sendir,1:1,...` |

### Estado — Comandos `get`

| Comando | Descripción |
|---------|-------------|
| `get status [dispositivo]` | Estado general del dispositivo |
| `get status [dispositivo] video` | Estado del stream de video |
| `get status [dispositivo] audio` | Estado del stream de audio |
| `get status [dispositivo] usb` | Estado del puerto USB |
| `get status [dispositivo] serial` | Estado del puerto serial |
| `get status [dispositivo] ir` | Estado del puerto IR |
| `get video_status` | Estado de todos los streams de video |
| `get devices all` | Lista de todos los dispositivos conectados |
| `get ver` | Versión del firmware del controlador |
| `get presets` | Lista de presets guardados |
| `get matrix_status` | Estado completo de la matriz |

Respuestas típicas de `get status`: `CONNECTED`, `STOPPED`, `TIMEOUT`, `DISCONNECTED`, `OUT OF RANGE`.

## Reglas de nombrado de dispositivos

- **Máximo 19 caracteres**
- **Sin espacios** (usar guiones bajos o CamelCase)
- **Nombres reservados** (no pueden usarse como nombre de dispositivo): `all`, `all_rx`, `all_tx`, `ungrouped`, `all_devices`
- Tampoco pueden coincidir con nombres de **Grupos** ni de **Presets** existentes

## Requisitos de red

| Requisito | Detalle |
|-----------|---------|
| Switch | Gestionado Layer 2 gigabit |
| Multicast | Habilitado |
| Jumbo frames | MTU 9000 (recomendado) |
| IGMP snooping | Activo (obligatorio) |
| PoE | 802.3af, 15.4W por puerto |
| DHCP | Recomendado (fallback a APIPA 169.254.x.x) |

## Flujo de control en SportBar

1. La aplicación React envía comandos HTTP GET al Arranger en `192.168.2.254`
2. En desarrollo, el proxy de [[../Configuracion/ViteProxy]] redirige `/api` al Arranger
3. El Arranger traduce cada comando en acciones sobre los encoders y decoders
4. Para audio, los comandos `send serial` pasan por el puerto RS232 del encoder DTV1 hacia el procesador Tesira
5. Para cambio de canales DirecTV, el comando IR viaja: Arranger → IPEX5001 IR OUT → receptor IR del decodificador

## Relaciones

- [[../Dispositivos/IPEX5001-Encoder]] — encoders gestionados por el controlador
- [[../Dispositivos/IPEX5002-Decoder]] — decoders gestionados por el controlador
- [[../Dispositivos/DirecTV-Decos]] — fuentes controladas vía IR a través del controlador
- [[../Dispositivos/Decodificadores]] — catálogo general de fuentes
- [[../Dispositivos/ZonasAudio]] — audio controlado vía serial a través del controlador
- [[../API/ArrangerApi]] — implementación del cliente HTTP en el proyecto
- [[../Componentes/Arranger]] — interfaz web nativa del controlador
- [[../Conceptos/SistemaPresets]] — presets que el controlador ejecuta
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
