# IPEX5002 Decoder

Receptor HDMI sobre IP fabricado por **Liberty AV / DigitaLinx IP**. Decodifica streams JPEG2000 recibidos por red IP y los convierte en salida HDMI para conectar a televisores o displays. Funciona como destino de video en el ecosistema Arranger Digi IP 5000.

## Especificaciones técnicas

| Parámetro | Valor |
|-----------|-------|
| Video máximo | 4K/30Hz 4:4:4 |
| HDCP | 2.2 |
| Codificación | JPEG2000 VBR |
| Latencia | 17-33ms (1-2 frames a 60Hz) |
| Bitrate promedio 4K | 250 Mbps |
| Bitrate promedio 1080p | 150 Mbps |
| Bitrate pico | 850 Mbps |
| Video wall máximo | 16×16 con [[../../../../Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]] |
| Alimentación | 12V DC o PoE 802.3af Alternative B (6W) |
| Escalado | Auto-escala a la resolución nativa del display conectado |

## Resoluciones soportadas

| Resolución | Frecuencia | HDCP |
|-----------|-----------|------|
| 3840×2160 | 30Hz | 2.2 |
| 1920×1080 | 60Hz | 2.2 |
| 1920×1080 | 50Hz | 2.2 |
| 1280×720 | 60Hz | 2.2 |
| 1280×720 | 50Hz | 2.2 |
| 720×480 | 60Hz | 2.2 |
| 720×576 | 50Hz | 2.2 |
| 1024×768 | 60Hz | 2.2 |
| 1360×768 | 60Hz | 2.2 |
| 1280×1024 | 60Hz | 2.2 |

## RS232 — Especificaciones

| Parámetro | Valor |
|-----------|-------|
| Conector | Terminal 3 pines (TX, RX, GND) |
| Baud rates | 2400, 4800, 9600, 19200, 38400, 57600, 115200 |
| Modo Control | Passthrough bidireccional — los datos viajan con el stream de video |
| Modo Matrix | Control directo del decoder (configuración local) |
| Switch de modo | Selector físico en panel frontal (Control / Matrix) |
| Terminador | `\x0A` (LF) para comandos seriales |

### Modos del switch RS232

| Posición | Función |
|----------|---------|
| **RS232** (Matrix) | El puerto serial recibe comandos de control del Arranger vía red — usado para enviar comandos a displays y periféricos en el extremo remoto |
| **Control** | El puerto serial está disponible para configuración local directa del decoder |

## PoE (Power over Ethernet)

| Parámetro | Valor |
|-----------|-------|
| Estándar | IEEE 802.3af |
| Modo | Alternative B (pares 4-5 y 7-8) |
| Consumo típico | 6W |
| Potencia máxima | 12.95W (entregada por el switch) |

> **Diferencia con el encoder**: El [[../../../../Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]] usa Alternative A (pares 1-2 y 3-6). Esto es relevante para switches PoE que solo soportan un modo.

## DIP Switch — Configuración de ID

El DIP switch de 4 posiciones en el panel frontal asigna un ID al dispositivo:

| DIP 1 | DIP 2 | DIP 3 | DIP 4 | ID |
|-------|-------|-------|-------|----|
| OFF | OFF | OFF | OFF | 0 (default) |
| ON | OFF | OFF | OFF | 1 |
| OFF | ON | OFF | OFF | 2 |
| ON | ON | OFF | OFF | 3 |
| ... | ... | ... | ... | ... |
| ON | ON | ON | ON | 15 |

El ID se usa para identificación en el Arranger y para video wall (posición en la grilla).

## Diferencias con el Encoder

| Característica | [[../../../../Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]] | IPEX5002 Decoder |
|---------------|----------------------|-------------------|
| Dirección de video | Entrada HDMI → Red IP | Red IP → Salida HDMI |
| PoE | Alternative A | Alternative B |
| Audio embebido | Sí (entrada analógica) | No (solo desembebe) |
| Loop-through HDMI | Sí | No |
| USB HOST | Type B (para PC) | 2× Type A (para periféricos) |
| Imagen idle | No | Sí (splash screen) |
| Video mute | No | Sí |
| Rotación de video | No | Sí |
| Latencia | 17-33ms | 17-33ms |

## Puertos (panel trasero)

| Letra | Puerto | Función |
|-------|--------|---------|
| A | 12V DC | Entrada de alimentación (alternativa a PoE) |
| B | RESET | Botón de reset físico |
| C | LAN RJ45 | Red gigabit, PoE 802.3af Alternative B |
| D | Audio OUT (3.5mm TRS) | Salida de audio analógico — desembebe audio del stream HDMI |
| E | RS232 (3-pin terminal) | Puerto serial: TX, RX, GND — passthrough para control de terceros |
| F | HDMI OUT (Type A) | Salida de video/audio HDMI hacia el display |
| G | IR IN (3.5mm TRS) | Receptor de señales infrarrojas |
| H | IR OUT (3.5mm TRS) | Emisor IR para controlar dispositivos locales |

## Panel frontal

- Indicador **Power** (encendido)
- Indicador **Status** (conexión y actividad)
- Switch de función **RS232** (Control / Matrix)
- DIP switch de 4 posiciones (configuración de ID del dispositivo)
- 2× puertos USB Device (Type A) para teclado y mouse

## Capacidades

### Enrutamiento IR
Las señales IR siguen la ruta de video en sentido inverso: un control remoto apuntado al IR IN del decoder transmite la señal IR por la red IP hasta el [[../../../../Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]] asociado, que la emite por su puerto IR OUT hacia el dispositivo fuente (ej: decodificador DirecTV).

### RS232
- Passthrough serial bidireccional entre encoder y decoder
- Los datos seriales viajan junto con el stream de video
- Permite controlar dispositivos seriales en el extremo remoto sin cableado adicional
- Selección de modo vía switch físico: Control (local) vs Matrix (passthrough)
- Baud rates configurables: 2400-115200

### USB HID
- Dos puertos USB Type A en el panel frontal
- Teclado y mouse conectados al decoder controlan la PC conectada al [[../../../../Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]] vía USB HOST
- La señal USB sigue la ruta de video igual que IR y RS232

### CEC
- Controla encendido/apagado del display conectado mediante comandos HDMI CEC
- El decoder puede enviar comandos CEC al TV sin intervención del controlador
- Comandos API: `send cec`, `send cec_on`, `send cec_off`
- [[../../../../Componentes/Audio]] podría beneficiarse de CEC para control de displays en zonas de audio

### Funciones de display
- **Identify**: muestra el nombre del dispositivo en pantalla durante 30 segundos (útil para identificar TVs en instalaciones grandes)
- **Imagen idle**: splash screen personalizada cuando no hay video activo (JPG 1280×720, máximo 1.5 MB)
- **Video mute**: apaga la salida de video sin desconectar el stream
- **Rotación**: rota la imagen 0°/90°/180°/270°
- **Control de aspecto**: ajusta la relación de aspecto de la imagen

## Solución de problemas

| Síntoma | Causa probable | Acción |
|---------|---------------|--------|
| Sin imagen en el TV | Decoder no recibiendo stream | Verificar comando `get status` en el [[../../../../Dispositivos/Liberty/Controladores/Arranger-IPEXCB|Arranger-IPEXCB]] |
| Imagen con artifacts | Pérdida de paquetes en red | Verificar IGMP snooping y jumbo frames en el switch |
| IR no controla la fuente | Ruta de video incorrecta | Verificar que el `join av` asocie el decoder correcto con el encoder fuente |
| Display no enciende con CEC | CEC no soportado por el TV | Verificar que CEC esté habilitado en el menú del TV |
| USB no funciona | Dispositivo no HID | Solo teclados y mouse son soportados |
| RS232 no responde | Switch en modo incorrecto | Verificar posición Control vs Matrix en panel frontal |

## Requisitos de red

- Switch gestionado Layer 2 gigabit
- Multicast habilitado
- Jumbo frames (MTU 9000 recomendado)
- IGMP snooping activo
- PoE 802.3af (15.4W por puerto)

## Relaciones

- [[../../../../Dispositivos/Liberty/Distribucion/IPEX5001-Encoder]] — encoder complementario que origina el stream
- [[../../../../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — controlador central que enruta los streams
- [[../../../../API/ArrangerApi]] — API de control del sistema
- [[../../../../API/SendSerial]] — comando `send serial` para control RS-232 remoto
- [[../../../../Conceptos/SistemaPresets]] — presets que almacenan asignaciones de video
- [[../../../../API/GetMatrix]] — validación de conexiones activas de video
- [[../../../../API/GetJoins]] — consulta de encoder conectado a este decoder
- [[../../../../API/GetStatus]] — consulta de estado individual de este decoder
- [[../../../../README]] — documentación general
- [[../../../../AGENTS]] — schema de la wiki
