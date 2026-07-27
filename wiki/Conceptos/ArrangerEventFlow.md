# ArrangerEventFlow

Sistema de notificaciones push del [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger IPEXCB]] que permite monitoreo en tiempo real del estado del hardware sin polling constante. Utiliza el puerto TCP 6980 para enviar mensajes de eventos del sistema a clientes suscritos.

## Arquitectura de notificaciones

El Arranger actúa como un servidor de eventos que empuja mensajes `notify` a clientes TCP conectados en el puerto 6980. A diferencia de la API HTTP (request-response), las notificaciones son **push** y permiten reaccionar a cambios de estado sin consultar periódicamente.

```
Cliente TCP ──► Puerto 6980 ──► Arranger IPEXCB
                  ▲
                  │  notify serial / notify network / notify display / notify source
                  │
     (eventos push en tiempo real)
```

## Tipos de notificaciones

### `notify serial`
Notifica cuando un dispositivo recibe datos en su puerto serial.

```
notify serial <device_name> "<data_received>"
```

**Ejemplo**: `notify serial DTV1 "POWER_ON"`

**Caso de uso en SportBar**: Monitorear respuestas del procesador de audio Tesira sin necesidad de polling. El componente [[../Componentes/Audio]] podría suscribirse para recibir confirmación de comandos seriales.

### `notify network`
Notifica cambios en conectividad de red de los dispositivos.

```
notify network <device_name> <status>
```

**Ejemplo**: `notify network Encoder1 DISCONNECTED`

Estados posibles: `CONNECTED`, `DISCONNECTED`, `TIMEOUT`.

**Caso de uso en SportBar**: Detectar decodificadores o encoders que pierden conexión de red y alertar en la UI.

### `notify display`
Notifica cambios en el estado del display conectado a un decoder.

```
notify display <decoder_name> <status>
```

**Ejemplo**: `notify display TV01 ON`

Estados posibles: `ON`, `OFF`, `NO_SIGNAL`.

**Caso de uso en SportBar**: Monitorear qué TVs están encendidas o apagadas, útil para confirmar que los comandos CEC de encendido/apagado surtieron efecto.

### `notify source`
Notifica cambios en la fuente de video/audio de un decoder.

```
notify source <decoder_name> <stream_type> <encoder_name>
```

**Ejemplo**: `notify source Decoder1 video Encoder2`

Tipos de stream: `video`, `audio`, `serial`, `ir`, `usb`.

**Caso de uso en SportBar**: El de mayor valor para la app — detectar cambios de fuente en tiempo real y actualizar el estado visual del Aside sin recargar la página.

## Modo de suscripción

Los clientes se conectan al puerto TCP 6980 del Arranger y permanecen escuchando. No hay un comando explícito de "suscribirse" — todas las notificaciones se emiten a todos los clientes conectados.

### Comportamiento
- Las notificaciones llegan como texto plano con terminador de línea
- Todos los clientes conectados reciben todas las notificaciones (broadcast)
- Si un cliente se desconecta, las notificaciones se pierden (no hay buffer/cola desde el Arranger)

## Comando `set listener` (licenciado)

Configura un listener TCP persistente en el Arranger para reenviar datos a una IP/puerto específico:

```
set listener <id> <ip> <port>
```

- Requiere licencia activa
- Útil para arquitecturas donde un servidor centralizado recibe eventos de múltiples controladores
- No implementado en SportBar

## Comando `set events` (licenciado)

Permite configurar eventos personalizados que disparan acciones automáticas:

```
set events <event_type> <action>
```

- Requiere licencia activa
- Permite automatizar respuestas a cambios de estado (ej: al desconectarse un encoder, cargar un preset de fallback)
- Los eventos disparan presets, que pueden contener lógica condicional (ver [[ArrangerPresetLogic]])

## Posibilidades de integración para SportBar

### Escenario 1: Aside en tiempo real

Actualmente el Aside muestra el estado visual con colores CSS que se actualizan con polling y `window.location.reload()`. Con `notify source`:

1. Servidor Express abre conexión TCP al puerto 6980 del Arranger
2. Express recibe `notify source Decoder1 video Encoder2`
3. Express emite el evento vía WebSocket a los clientes React
4. El Aside actualiza colores instantáneamente, sin polling ni reload

### Escenario 2: Monitoreo de conectividad

Con `notify network`:

1. Express recibe `notify network DTV2 DISCONNECTED`
2. Express actualiza el state store con `online: false`
3. El componente Aside muestra un indicador de alerta en DTV2
4. El operador puede tomar acción antes de que un cliente reporte el problema

### Escenario 3: Validación de comandos

Con `notify source` + `notify serial`:

1. Se envía `join av DTV1 TV01`
2. Express recibe `notify source TV01 video DTV1` (confirmación)
3. Si no llega notificación en 2 segundos, se marca como timeout o fallo
4. Alternativa a polling con `get matrix` o `get joins`

### Limitaciones actuales

| Limitación | Impacto |
|------------|---------|
| Sin WebSocket en Express | No hay canal push del servidor al cliente React |
| TCP requiere conexión persistente | El servidor Express debe mantener socket abierto al puerto 6980 |
| Sin filtrado de notificaciones | Todas las notificaciones llegan a todos los suscriptores — requiere filtrado del lado cliente |
| Licencia requerida para `set events` | La automatización avanzada de eventos requiere licencia adicional |

## Relaciones

- [[../API/ArrangerApi]] — API HTTP complementaria a las notificaciones TCP
- [[../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — controlador que emite los eventos en puerto 6980
- [[../Componentes/Aside]] — componente que más se beneficiaría de notificaciones en tiempo real
- [[../Componentes/MatrizVideo]] — consumidor de `notify source` para estado de enrutamiento
- [[../Componentes/Audio]] — consumidor de `notify serial` para confirmación de comandos Tesira
- [[ArrangerPresetLogic]] — lógica que puede ser disparada por eventos (`set events`)
- [[../Configuracion/ViteProxy]] — proxy Express que podría actuar como puente TCP↔WebSocket
- [[APIErrorHandling]] — las notificaciones de desconexión complementan el manejo de errores
