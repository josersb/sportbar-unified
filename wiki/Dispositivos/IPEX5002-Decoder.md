# IPEX5002 Decoder

Receptor HDMI sobre IP fabricado por **Liberty AV / DigitaLinx IP**. Decodifica streams JPEG2000 recibidos por red IP y los convierte en salida HDMI para conectar a televisores o displays. Funciona como destino de video en el ecosistema Arranger Digi IP 5000.

## Especificaciones técnicas

| Parámetro | Valor |
|-----------|-------|
| Video máximo | 4K/30Hz 4:4:4 |
| HDCP | 2.2 |
| Codificación | JPEG2000 VBR |
| Bitrate promedio 4K | 250 Mbps |
| Bitrate promedio 1080p | 150 Mbps |
| Bitrate pico | 850 Mbps |
| Video wall máximo | 16×16 con [[IPEX5001-Encoder]] |
| Alimentación | 12V DC o PoE 802.3af Alternative B (6W) |
| Escalado | Auto-escala a la resolución nativa del display conectado |

## Diferencias con el Encoder

| Característica | [[IPEX5001-Encoder]] | IPEX5002 Decoder |
|---------------|----------------------|-------------------|
| Dirección de video | Entrada HDMI → Red IP | Red IP → Salida HDMI |
| PoE | Alternative A | Alternative B |
| Audio embebido | Sí (entrada analógica) | No (solo desembebe) |
| Loop-through HDMI | Sí | No |
| USB HOST | Type B (para PC) | 2× Type A (para periféricos) |
| Imagen idle | No | Sí (splash screen) |
| Video mute | No | Sí |
| Rotación de video | No | Sí |

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
- Switch de función **RS232** (selección de modo)
- DIP switch de 4 posiciones (configuración de ID del dispositivo)
- 2× puertos USB Device (Type A) para teclado y mouse

## Capacidades

### Enrutamiento IR
Las señales IR siguen la ruta de video en sentido inverso: un control remoto apuntado al IR IN del decoder transmite la señal IR por la red IP hasta el [[IPEX5001-Encoder]] asociado, que la emite por su puerto IR OUT hacia el dispositivo fuente (ej: decodificador DirecTV).

### RS232
- Passthrough serial bidireccional
- Los datos seriales viajan junto con el stream de video entre encoder y decoder
- Permite controlar dispositivos seriales en el extremo remoto sin cableado adicional

### USB HID
- Dos puertos USB Type A en el panel frontal
- Teclado y mouse conectados al decoder controlan la PC conectada al [[IPEX5001-Encoder]] vía USB HOST
- La señal USB sigue la ruta de video igual que IR y RS232

### CEC
- Controla encendido/apagado del display conectado mediante comandos HDMI CEC
- El decoder puede enviar comandos CEC al TV sin intervención del controlador

### Funciones de display
- **Identify**: muestra el nombre del dispositivo en pantalla durante 30 segundos (útil para identificar TVs en instalaciones grandes)
- **Imagen idle**: splash screen personalizada cuando no hay video activo (JPG 1280×720, máximo 1.5 MB)
- **Video mute**: apaga la salida de video sin desconectar el stream
- **Rotación**: rota la imagen 0°/90°/180°/270°
- **Control de aspecto**: ajusta la relación de aspecto de la imagen

## Solución de problemas

| Síntoma | Causa probable | Acción |
|---------|---------------|--------|
| Sin imagen en el TV | Decoder no recibiendo stream | Verificar comando `get status` en el [[Arranger-IPEXCB]] |
| Imagen con artifacts | Pérdida de paquetes en red | Verificar IGMP snooping y jumbo frames en el switch |
| IR no controla la fuente | Ruta de video incorrecta | Verificar que el `join av` asocie el decoder correcto con el encoder fuente |
| Display no enciende con CEC | CEC no soportado por el TV | Verificar que CEC esté habilitado en el menú del TV |
| USB no funciona | Dispositivo no HID | Solo teclados y mouse son soportados |

## Requisitos de red

- Switch gestionado Layer 2 gigabit
- Multicast habilitado
- Jumbo frames (MTU 9000 recomendado)
- IGMP snooping activo
- PoE 802.3af (15.4W por puerto)

## Relaciones

- [[../Dispositivos/IPEX5001-Encoder]] — encoder complementario que origina el stream
- [[../Dispositivos/Arranger-IPEXCB]] — controlador central que enruta los streams
- [[../API/ArrangerApi]] — API de control del sistema
- [[../Conceptos/SistemaPresets]] — presets que almacenan asignaciones de video
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
