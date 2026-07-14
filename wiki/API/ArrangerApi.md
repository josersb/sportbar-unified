# ArrangerApi

API cliente para la comunicación con el controlador Arranger IPEX5000 en `192.168.2.254`. Centraliza la construcción y envío de comandos HTTP GET en modo `no-cors` para controlar la matriz audiovisual, decodificadores y procesador de audio Tesira.

Ubicación: `src/api/arrangerApi.js`

## Configuración

| Parámetro | Valor por defecto | Variable de entorno |
|-----------|-------------------|---------------------|
| Base URL | `http://192.168.2.254/api/command` | `VITE_ARRANGER_API_BASE` |
| Token | `TOKEN_REMOVED` | `VITE_ARRANGER_TOKEN` |

## Funciones exportadas

### `sendArrangerCommand(command, options?)`
Función base. Construye la URL como:
```
${ARRANGER_BASE_URL}/${encodeURIComponent(command)}/${ARRANGER_TOKEN}
```
Envía un `fetch` con `method: "GET"`, `mode: "no-cors"`, `cache: "default"`. En modo desarrollo loguea el status.

### `assignSourceToDestination(source, destination)`
Wrapper para el comando `join av`. Construye el comando y llama a `sendArrangerCommand`.

### `buildArrangerCommand(command, ...args)`
Utilidad para construir comandos dinámicamente. Aplana arrays anidados recursivamente y une con espacios.

### `ARRANGER_API_CONFIG`
Objeto exportado con `{ baseUrl, token }` para uso en otros módulos.

## Comandos disponibles

### `join av [SOURCE] [DEST]`
Conecta una fuente de audio/video a un destino. Usado por [[../Componentes/MatrizVideo]] y [[../Componentes/MatrizPreset]].

Ejemplo: `join av DTV1 TV01` → `join%20av%20DTV1%20TV01`

### `preset load [PRESET_NAME]`
Carga un preset predefinido en el Arranger. Usado por [[../Componentes/Canales]] para cambiar canales.

Ejemplo: `preset load deco1canal1603` → `preset%20load%20deco1canal1603`

### `send serial [DEVICE] "[COMMAND]"`
Envía comandos seriales a dispositivos conectados. Usado por [[../Componentes/Audio]] para controlar el procesador Tesira.

Ejemplo: `send serial DTV1 "Mute1 set mute 1 true\x0A"`

### `get status [DEVICE] [STREAM?]`
Obtiene el estado de un dispositivo. Documentado en `API commands/get_status.txt`. Streams: `video`, `audio`, `usb`, `serial`, `ir`.

### `devices all`
Lista todos los dispositivos conectados al Arranger.

## Modo no-cors

Todas las llamadas usan `mode: "no-cors"`. Esto implica que:
- El navegador envía la request pero no permite leer la respuesta
- No se puede verificar el body de la respuesta
- Los errores de red se capturan con `catch` pero no se puede distinguir éxito/fallo por status HTTP
- Es una limitación del entorno — el Arranger no configura headers CORS

## Relaciones

- Usado por [[../Componentes/MatrizVideo]] — comandos `join av`
- Usado por [[../Componentes/MatrizPreset]] — comandos `join av` en carga de presets
- Usado por [[../Componentes/Canales]] — comandos `preset load`
- Usado por [[../Componentes/Audio]] — comandos `send serial` para Tesira
- Controla [[../Dispositivos/Decodificadores]] y [[../Dispositivos/ZonasAudio]]
- [[../Configuracion/ViteProxy]] — en desarrollo, las llamadas pasan por el proxy de Vite
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
