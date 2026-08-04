# IPEX5001 Encoder

Transmisor HDMI sobre IP fabricado por **Liberty AV / DigitaLinx IP**. Codifica señales HDMI de video y audio para transporte sobre red IP mediante compresión JPEG2000. Funciona como fuente de entrada en el ecosistema Arranger Digi IP 5000.

## Especificaciones técnicas

| Parámetro | Valor |
|-----------|-------|
| Video máximo | 4K/60Hz 4:2:0 |
| HDCP | 2.2 |
| Audio | 7.1 multicanal |
| Codificación | JPEG2000 VBR |
| Bitrate promedio 4K | 250 Mbps |
| Bitrate promedio 1080p | 150 Mbps |
| Bitrate pico | 850 Mbps |
| Latencia | 17–33 ms (1–2 frames) |
| Matriz máxima | 45 encoders en switch 48 puertos |
| Video wall máximo | 16×16 con decoders [[../../../../Dispositivos/Liberty/Distribucion/IPEX5002-Decoder]] |
| Alimentación | 12V DC o PoE 802.3af Alternative A (6W) |

## Puertos (panel trasero)

| Letra | Puerto | Función |
|-------|--------|---------|
| A | 12V DC | Entrada de alimentación (alternativa a PoE) |
| B | RESET | Botón de reset físico |
| C | LAN RJ45 | Red gigabit, PoE 802.3af Alternative A |
| D | Audio IN (3.5mm TRS) | Entrada de audio analógico — embebe audio con el video |
| E | Audio OUT (3.5mm TRS) | Salida de audio analógico — desembebe audio del HDMI |
| F | RS232 (3-pin terminal) | Puerto serial: TX, RX, GND — modo passthrough o control |
| G | USB HOST (Type B) | Control USB desde PC remoto (HID únicamente) |
| H | HDMI IN (Type A) | Entrada de video/audio HDMI |
| I | HDMI OUT (Type A) | Salida loop-through local (monitoreo) |
| J | IR IN (3.5mm TRS) | Receptor de señales infrarrojas |
| K | IR OUT (3.5mm TRS) | Emisor IR para controlar dispositivos terceros |

## Panel frontal

- Indicador **Power** (encendido)
- Indicador **Status** (conexión y actividad)
- Switch de función **RS232** (selección de modo)
- DIP switch de 4 posiciones (configuración de ID del dispositivo)

## Capacidades

### Enrutamiento IR
Las señales IR viajan junto con el video: cuando un decodificador [[../../../../Dispositivos/Liberty/Distribucion/IPEX5002-Decoder]] recibe IR en su puerto IR IN, la señal viaja de vuelta por la red IP hacia el encoder y sale por el puerto IR OUT. Esto permite controlar remotamente el dispositivo fuente (ej: decodificador DirecTV) desde la ubicación del TV.

### RS232
- Baud rates soportados: 2400 a 115200
- Dos modos de operación: **MATRIX** (passthrough con enrutamiento por video) y **CONTROL** (comando directo)
- En modo MATRIX, los datos seriales siguen la ruta de video entre encoder y decoder
- El switch del panel frontal selecciona el modo activo

### USB HID
- Solo dispositivos HID (teclado, mouse)
- El USB sigue la ruta de video: un teclado conectado al decoder remoto controla la PC conectada al encoder
- No soporta almacenamiento masivo ni otros tipos de dispositivos USB

### CEC
- Soporta HDMI CEC para encendido/apagado del display conectado
- El encoder puede transmitir comandos CEC hacia el display en el loop-through

### PoE
- Alimentación por PoE 802.3af Alternative A (6W máximo)
- No requiere fuente de alimentación local si el switch entrega PoE
- La fuente 12V DC incluida es alternativa para switches sin PoE

## Accesorios incluidos

- Fuente de alimentación 12V DC
- Emisor IR (conector 3.5mm TRS)
- Receptor IR (conector 3.5mm TRS)
- Orejas de montaje para rack
- Bornera de 3 pines (para puerto RS232)

## Integración en SportBar

Cada fuente de video del SportBar se conecta a un IPEX5001. Los encoders convierten las señales HDMI de los decodificadores y otras fuentes en streams IP que el controlador [[../../../../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] enruta hacia los decodificadores y TVs del local.

En la instalación actual, los dispositivos **DTV7** y **DTV8** del sistema NO son decodificadores DirecTV sino encoders IPEX5001 adicionales identificados como `E-OBS_CS` y `F-STREAMING-CS` en el controlador Arranger (ver [[../../../../Dispositivos/DirecTV/Decodificadores/Decodificadores]]).

## Solución de problemas

| Síntoma | Causa probable | Acción |
|---------|---------------|--------|
| Sin video en el decoder | Cable HDMI defectuoso o fuente apagada | Verificar loop-through en HDMI OUT con monitor local |
| LED Status apagado | Sin conexión de red o PoE | Verificar cable LAN y que el switch entregue PoE |
| IR no funciona | Emisor IR mal ubicado | Reubicar emisor sobre el receptor IR del dispositivo fuente |
| RS232 sin respuesta | Baud rate incorrecto o modo equivocado | Verificar que el switch RS232 esté en MATRIX para passthrough |
| Video congelado | Pérdida de paquetes en la red | Verificar IGMP snooping y jumbo frames en el switch |

## Requisitos de red

- Switch gestionado Layer 2 gigabit
- Multicast habilitado
- Jumbo frames (MTU 9000 recomendado)
- IGMP snooping activo
- PoE 802.3af (15.4W por puerto)

## Relaciones

- [[../../../../Dispositivos/Liberty/Distribucion/IPEX5002-Decoder]] — decoder complementario que recibe el stream
- [[../../../../Dispositivos/Liberty/Controladores/Arranger-IPEXCB]] — controlador central requerido para sistemas multi-dispositivo
- [[../../../../Dispositivos/DirecTV/Decodificadores/Decodificadores]] — fuentes de video conectadas a estos encoders
- [[../../../../Dispositivos/DirecTV/Decodificadores/Decodificadores]] — listado general de fuentes del sistema
- [[../../../../Conceptos/ZonasAudio]] — audio desembebido desde HDMI hacia el procesador Tesira
- [[../../../../API/ArrangerApi]] — API de control del sistema
- [[../../../../README]] — documentación general
- [[../../../../AGENTS]] — schema de la wiki
