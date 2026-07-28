# Samsung DBE / DME / DHE — Large Format Displays

Pantallas comerciales LCD de Samsung, series **DBE**, **DME** y **DHE** (2015). Diseñadas para entornos de señalización digital (digital signage), uso continuo y control remoto vía RS-232C o Ethernet.

> **Fabricante**: Samsung Electronics
> **Año del manual**: 2015
> **Fuente**: `Docs/manuals/extracted/pdf-inspector/Samsung_DBE_DME_DHE_WebManual_ES.md`

## Modelos

### DBE — Versión básica
**Limitación**: uso recomendado de **menos de 16 horas diarias**. Si se supera, la garantía puede anularse.

| Modelo | Tamaño |
|--------|--------|
| DB32E | 32" |
| DB40E | 40" |
| DB48E | 48" |
| DB55E | 55" |

### DME — Versión estándar
Uso continuo permitido. Incluye DisplayPort y soporte para daisy-chain DP OUT.

| Modelo | Tamaño |
|--------|--------|
| DM32E | 32" |
| DM40E | 40" |
| DM48E | 48" |
| DM55E | 55" |
| DM65E | 65" |
| DM75E | 75" |

### DHE — Versión avanzada
Uso continuo. Similar a DME con diferencia en dimensiones físicas y peso.

| Modelo | Tamaño |
|--------|--------|
| DH40E | 40" |
| DH48E | 48" |
| DH55E | 55" |

## Puertos de entrada

| Puerto | DBE | DME | DHE |
|--------|-----|-----|-----|
| RGB IN (D-SUB 15 pines, VGA) | Sí | Sí | Sí |
| DVI / MAGICINFO IN | Sí | Sí | Sí |
| HDMI IN | Sí | Sí | Sí |
| DP IN (DisplayPort) | No | Sí (excepto DM32E) | Sí |
| DP OUT (Loopout) | No | Sí (excepto DM32E) | Sí |
| AV / COMPONENT IN | Sí | Sí | Sí |
| AUDIO IN (RGB/DVI/HDMI/AV) | Sí | Sí | Sí |
| AUDIO OUT | Sí | Sí | Sí |
| LAN (RJ45) | Sí | Sí | Sí |
| RS232C IN (D-Sub 9 + jack 3.5mm) | Sí | Sí | Sí |
| RS232C OUT (D-Sub 9) | Sí | Sí | Sí |
| USB | Sí | Sí | Sí |

## Protocolos de control

### RS-232C (Serial)

#### Especificaciones del puerto

| Parámetro | Valor |
|-----------|-------|
| Velocidad de bits | 9600 bps |
| Bits de datos | 8 bits |
| Paridad | No (none) |
| Bit de parada | 1 bit |
| Control de flujo | No (none) |
| Longitud máxima | 15 m (cable blindado) |

#### Conectores físicos

| Conector | Pines |
|----------|-------|
| D-Sub 9 pines (macho/hembra) | TxD pin 2, RxD pin 3, GND pin 5 |
| Jack estéreo 3.5mm (alternativo) | Punta = TxD, Anillo = RxD, Manga = GND |

Se incluye un adaptador RS232C (IN) de fábrica para convertir entre D-Sub 9 pines y jack estéreo.

#### Daisy-chain RS-232C

```
PC[RS232C] → Display1[RS232C IN] → Display1[RS232C OUT] → Display2[RS232C IN] → Display2[RS232C OUT] → ...
```

#### Formato de comando

```
| Header | Command | ID | DataLength | Data | Checksum |
|--------|---------|----|------------|------|----------|
| 0xAA   | 0x??    | 0x?? | 0x??     | 0x?? | 0x??     |
```

**Reglas**:
- Toda la comunicación es en **hexadecimal**.
- **Checksum**: suma de todos los bytes excepto el header. Si la suma excede 2 dígitos, se descarta el carry (ej: `11+FF+01+01 = 0x112` → checksum = `0x12`).
- **Broadcast**: ID = `0xFE` para enviar comandos a **todos los displays conectados en daisy-chain** simultáneamente. No se devuelve ACK en modo broadcast.
- Cada display debe tener un **ID de dispositivo único** configurado desde el menú OSD (rango 0-255).

#### Respuesta del display

| Tipo | Formato |
|------|---------|
| ACK | `0xAA 0xFF [ID] 3 'A' [Command] [Value] [Checksum]` |
| NAK | `0xAA 0xFF [ID] 3 'N' [Command] "ERR" [Checksum]` |

### Ethernet / LAN (RJ45)

- Control vía software **MDC Unified** (Multiple Display Control) de Samsung sobre TCP/IP.
- Conexión directa o mediante HUB Ethernet.
- Daisy-chain entre displays usando cable LAN (el display 1 conecta al PC vía RJ45, los siguientes se encadenan por RS232C OUT → RS232C IN).
- El software MDC corre en Windows y permite controlar múltiples displays desde una interfaz gráfica.

## Control IR (Infrarrojo)

### Cableado

El IPEX5002 dispone de un puerto **IR OUT** (jack 3.5mm TRS) que permite emitir señales infrarrojas hacia dispositivos locales. La Samsung DBE/DME/DHE tiene un puerto **IR/AMBIENT SENSOR IN** (jack 3.5mm) para recibir señales IR por cable.

```
IPEX5002-TVRACK (IR OUT)              TV Samsung (IR/AMBIENT SENSOR IN)
  ┌──────────────────────┐              ┌──────────────────────────────┐
  │ Jack 3.5mm TRS ──────┼──cable──────┼── Jack 3.5mm                 │
  │ (IR emitter out)      │  estéreo    │  (entrada IR cableada)       │
  └──────────────────────┘              └──────────────────────────────┘
```

Se utiliza un cable estéreo 3.5mm macho-macho estándar. Sin adaptadores DB9 ni configuración de baud rate.

### Envío de comandos

El Arranger soporta el comando `send ir` para emitir códigos infrarrojos en formato **Pronto HEX** a través del puerto IR OUT de cualquier decoder:

```
send ir <device_name> <pronto_hex_code>
```

En SportBar, se usa `sendIrCommand(deviceId, hexCode)` de la [[../../../API/ArrangerApi]].

### Comandos disponibles (23)

Los siguientes códigos fueron capturados del mando a distancia Samsung y almacenados en formato Pronto HEX:

| # | Comando | Verificado | Uso en SportBar |
|---|---------|-----------|-----------------|
| 1 | Power On | 🔲 | Encender TV |
| 2 | Power Off | 🔲 | Apagar TV |
| 3 | Power Toggle | 🔲 | Alternar encendido |
| 4 | Volume Up | ✅ | Subir volumen |
| 5 | Volume Down | 🔲 | Bajar volumen |
| 6 | Mute Toggle | 🔲 | Silenciar |
| 7 | Channel Up | 🔲 | Cambiar canal |
| 8 | Channel Down | 🔲 | Cambiar canal |
| 9 | Previous Channel | 🔲 | Volver al canal anterior |
| 10 | Input HDMI 1 | 🔲 | Seleccionar fuente HDMI 1 |
| 11 | Input HDMI 2 | 🔲 | Seleccionar fuente HDMI 2 |
| 12 | Input HDMI 3 | 🔲 | Seleccionar fuente HDMI 3 |
| 13 | Input HDMI 4 | 🔲 | Seleccionar fuente HDMI 4 |
| 14 | Cursor Up | 🔲 | Navegación |
| 15 | Cursor Down | 🔲 | Navegación |
| 16 | Cursor Left | 🔲 | Navegación |
| 17 | Cursor Right | 🔲 | Navegación |
| 18 | Cursor Enter | 🔲 | Seleccionar |
| 19 | Home | 🔲 | Ir a inicio |
| 20 | Exit | 🔲 | Salir |
| 21 | Return | 🔲 | Volver |
| 22 | Main Menu | 🔲 | Menú principal |
| 23 | Volume Up | ✅ | **Verificado in situ — 2026-07-28** |

> ✅ = Verificado en el sitio con IPEX5002-TVRACK → Samsung TV real  
> 🔲 = Pendiente de verificación (el formato de código es consistente con el verificado)

Los códigos completos en formato Pronto HEX están en:
`Docs/equipaments/Tvs Samsung/Codigo pronto IR - samsung v1.txt`

### Comandos prioritarios para SportBar

| Prioridad | Comando | Aplicación |
|-----------|---------|-----------|
| Alta | Power On / Power Off | Apagar/encender TVs por zona u horario |
| Alta | Volume Up / Down / Mute | Control de volumen por TV |
| Alta | Input HDMI 1-4 | Cambiar fuente si hay múltiples entradas |
| Media | Channel Up / Down | Si la TV tiene sintonizador propio |
| Baja | Navegación (cursores, Home) | Solo para configuración remota |

## Tabla de comandos RS-232C

| # | Comando | Código | Rango | Descripción |
|---|---------|--------|-------|-------------|
| 1 | Power Control | `0x11` | 0–1 | `0` = Apagado, `1` = Encendido |
| 2 | Volume Control | `0x12` | 0–100 | Volumen (0 = mute, 100 = máximo) |
| 3 | Input Source | `0x14` | Códigos¹ | Selecciona fuente de entrada |
| 4 | Screen Mode | `0x18` | Códigos² | 16:9, Zoom, 4:3 |
| 5 | Screen Size | `0x19` | 0–255 | Tamaño personalizado de pantalla |
| 6 | PIP On/Off | `0x3C` | 0–1 | Activar/desactivar Picture-in-Picture |
| 7 | Auto Adjustment | `0x3D` | 0 (fijo) | Auto-ajuste (solo PC y BNC) |
| 8 | Video Wall Mode | `0x5C` | 0–1 | `0` = Natural, `1` = Full |
| 9 | Safety Lock | `0x5D` | 0–1 | Bloquea panel frontal (funciona incluso apagado) |
| 10 | Video Wall On | `0x84` | 0–1 | Activar/desactivar modo Video Wall |
| 11 | Video Wall User | `0x89` | — | Posición en matriz N×M (ver abajo) |

**Notas**:
- PIP no funciona si Video Wall está activado.
- Auto Adjustment y PIP no disponibles en modo MagicInfo.
- Screen Mode no se puede controlar si Video Wall está activado.
- Los modelos DBE y DM32E no soportan output DisplayPort (DP OUT / Loopout).

#### ¹ Códigos de Input Source (`0x14`)

| Código | Fuente |
|--------|--------|
| `0x14` | PC (VGA / D-SUB) |
| `0x18` | DVI |
| `0x0C` | Componente |
| `0x08` | HDMI |
| `0x20` | MagicInfo |
| `0x1F` | DVI_video (solo Get) |
| `0x25` | DisplayPort |
| `0x30` | RF / TV (solo modelos con sintonizador) |
| `0x40` | DTV (solo modelos con sintonizador) |

> `DVI_video`, `HDMI1_PC`, `HDMI2_PC`, `HDMI1` y `HDMI2` no pueden usarse con el comando Set. Solo responden a comandos Get.

#### ² Códigos de Screen Mode (`0x18`)

| Código | Modo |
|--------|------|
| `0x01` | 16:9 |
| `0x04` | Zoom |
| `0x31` | Zoom ancho (Wide Zoom) |
| `0x0B` | 4:3 |

#### Comando Video Wall User (`0x89`)

Controla la posición de cada display en una matriz N×M (máximo 10×10).

```
Header    Command   ID    DataLength   Valor1      Valor2      Checksum
0xAA      0x89      ID    0x02         Wall_Div    Wall_SNo    CS
```

| Parámetro | Descripción |
|-----------|-------------|
| `Wall_Div` | Código de la celda en la cuadrícula 10×10 (matriz en el manual pág. 35-36) |
| `Wall_SNo` | Número de producto dentro del Video Wall (1–100) |

## MagicInfo

Sistema de cartelería digital (digital signage) propietario de Samsung. La aplicación web MagicInfo permite gestionar remotamente el contenido que se muestra en estas pantallas: programaciones, plantillas, canales de red y archivos multimedia.

### Modos principales

| Modo | Descripción |
|------|-------------|
| **Lite** | Servidor básico para contenido simple. Programación y aprobación desde MagicInfo Lite Server. |
| **Premium** | Servidor completo con funcionalidades avanzadas. Gestiona programaciones, plantillas, y múltiples dispositivos desde MagicInfo Premium Server. |

### Funcionalidades del Reproductor integrado

- **Canal de red**: reproduce contenido desde un servidor MagicInfo por Ethernet.
- **Canal local**: reproduce contenido desde almacenamiento interno o USB.
- **Contenido publicado**: contenido push desde el servidor.
- **Mis plantillas**: plantillas personalizadas para layouts.
- Formatos soportados: vídeo, imagen, PDF, Flash, Office, música.

### Configuración relevante

- **Reproducir a través de** → `MagicInfo` (en `Sistema` → `Reproducir a través de`)
- **Modo MagicInfo** → `Lite` o `Premium` (en `Config. red del servidor`)
- **Dirección del servidor**: IP + puerto (default 7001), con opción SSL
- **Aprobación del dispositivo**: el display debe ser aprobado desde el servidor MagicInfo antes de recibir contenido

Véase [[../Software/MagicInfo]] para la instalación específica del Hipódromo de Palermo.

## Relevancia para SportBar

Las Samsung DBE/DME/DHE pueden controlarse remotamente desde SportBar por dos vías:

### Control IR (infrarrojo) — Menor fricción
- **Cableado**: jack 3.5mm estéreo del IPEX5002 IR OUT al IR/AMBIENT SENSOR IN de la TV
- **Comando Arranger**: `send ir <device> <pronto_hex>`
- **Verificado**: Volume Up ✅ (2026-07-28)
- **Ventaja**: sin configuración de baud rate, cable estándar
- **Limitación**: unidireccional (sin feedback), requiere aprender códigos

### Control RS-232C — Mayor precisión

Si las TVs del SportBar son de estas líneas y están cableadas con RS-232C, se podrían controlar remotamente mediante comandos seriales enviados desde la app SportBar vía el [[../../Liberty/Controladores/Arranger-IPEXCB]] usando el comando `send serial`.

Los comandos más útiles para el entorno del bar:

| Necesidad | Comando | Bytes |
|-----------|---------|-------|
| Encender/Apagar TV | Power Control (`0x11`) | `0xAA 0x11 [ID] 1 [0/1] [CS]` |
| Ajustar volumen | Volume Control (`0x12`) | `0xAA 0x12 [ID] 1 [0-100] [CS]` |
| Cambiar fuente | Input Source (`0x14`) | `0xAA 0x14 [ID] 1 [Código] [CS]` |
| Seleccionar HDMI | Input Source → `0x08` | `0xAA 0x14 [ID] 1 0x08 [CS]` |

### Requisitos de integración

- **Hardware adicional**: adaptador USB-RS232 o servidor serial IP conectado al RS232C IN del primer display.
- **ID de dispositivo**: configurar IDs únicos en cada TV desde el menú OSD → `Sistema` → `Configuración de ID`.
- **Modo broadcast (`0xFE`)**: para enviar el mismo comando a todas las TVs en la cadena (ej: apagar todas al cierre).

### Integración con la app SportBar

Los comandos podrían enviarse desde React usando la [[../../API/ArrangerApi]] a través del comando `send serial` del Arranger, o directamente si se conecta un servidor serial intermedio. El estado de cada TV podría almacenarse en el [[../../Conceptos/StateManagement]] y la asignación de fuentes en [[../../Componentes/MatrizVideo]].

## Preguntas abiertas

- ¿Qué modelos específicos de Samsung hay instalados en el bar?
- ¿Están cableadas por RS-232C o solo reciben señal de video?
- ¿Tienen acceso a la red Ethernet del bar?
- ¿Están gestionadas actualmente con MagicInfo? (posible solapamiento con las TVs de cartelería)
- ¿Los decodificadores DirecTV se conectan vía HDMI a estas pantallas o pasan por la matriz Arranger?

## Referencias

- Manual original: `Docs/manuals arranger/samsung/Samsung_DBE_DME_DHE_EN.pdf`
- Markdowns extraídos: `Docs/manuals/extracted/pdf-inspector/Samsung_DBE_DME_DHE_WebManual_ES.md` (ES) y `_EN.md` (EN)
- Samsung Electronics, © 2015

## Plan de pruebas IR — IPEX5002-TVRACK

### Objetivo

Validar los 23 códigos IR contra el TV Samsung real a través del IPEX5002-TVRACK, y explorar la viabilidad del flujo loopback IR (control remoto → IR IN → red IP → IR OUT → TV).

### Preparación

| Requisito | Estado |
|---|---|
| Cable jack 3.5mm estéreo IPEX IR OUT → Samsung IR/AMBIENT SENSOR IN | ✅ Conectado |
| Arranger accesible desde la red del bar | ✅ |
| Códigos Pronto HEX disponibles (23) | ✅ `Docs/equipaments/Tvs Samsung/Codigo pronto IR - samsung v1.txt` |
| Volume Up verificado | ✅ 2026-07-28 |

---

### Fase 1 — Validación de los 22 códigos restantes

Para cada comando, enviar desde la consola del Arranger:

```
send ir TVRACK <pronto_hex>
```

**Importante**: `send ir` emite directamente desde el puerto IR OUT del decoder especificado. No requiere `join ir` previo — la señal se emite en el extremo local del decoder sin atravesar la red.

| # | Comando | Prioridad | Resultado | Fecha |
|---|---|---|---|---|
| 1 | Power On | 🔴 Alta | 🔲 | — |
| 2 | Power Off | 🔴 Alta | 🔲 | — |
| 3 | Power Toggle | 🔴 Alta | 🔲 | — |
| 4 | Volume Up | 🟢 Verificado | ✅ | 2026-07-28 |
| 5 | Volume Down | 🔴 Alta | 🔲 | — |
| 6 | Mute Toggle | 🟡 Media | 🔲 | — |
| 7 | Input HDMI 1 | 🔴 Alta | 🔲 | — |
| 8 | Input HDMI 2 | 🟡 Media | 🔲 | — |
| 9 | Input HDMI 3 | 🟡 Media | 🔲 | — |
| 10 | Input HDMI 4 | 🟡 Media | 🔲 | — |
| 11 | Channel Up | 🟢 Baja | 🔲 | — |
| 12 | Channel Down | 🟢 Baja | 🔲 | — |
| 13 | Previous Channel | 🟢 Baja | 🔲 | — |
| 14 | Cursor Up | 🟢 Baja | 🔲 | — |
| 15 | Cursor Down | 🟢 Baja | 🔲 | — |
| 16 | Cursor Left | 🟢 Baja | 🔲 | — |
| 17 | Cursor Right | 🟢 Baja | 🔲 | — |
| 18 | Cursor Enter | 🟢 Baja | 🔲 | — |
| 19 | Home | 🟢 Baja | 🔲 | — |
| 20 | Exit | 🟢 Baja | 🔲 | — |
| 21 | Return | 🟢 Baja | 🔲 | — |
| 22 | Main Menu | 🟢 Baja | 🔲 | — |
| 23 | Volume Up (duplicado) | — | ✅ | 2026-07-28 |

---

### Fase 2 — Loopback IR: control remoto → red IP → TV

**Hipótesis**: ¿El Arranger puede transportar señales IR recibidas por el IR IN de un IPEX a través de la red IP hacia el IR OUT de otro IPEX?

**Fundamento**: El Arranger tiene comandos `join ir` y `join all` para enrutar señales IR independientemente del audio/video. El `join av` solo enruta audio y video — los puertos IR, serial y USB requieren sus propios joins.

**Comandos relevantes** (todos 🔲 pendientes de implementar en SportBar, disponibles en el Arranger):

| Comando | Función |
|---------|---------|
| `join ir <encoder> <decoder>` | Enrutar solo IR entre encoder y decoder |
| `join all <encoder> <decoder>` | Enrutar todas las señales (video + audio + IR + serial + USB) |
| `leave ir <decoder>` | Desconectar ruta IR |
| `leave all <decoder>` | Desconectar todas las rutas |

#### Sub-fase 2A: Loopback con `join ir`

```
Paso 1: join ir <encoder_rack> TVRACK
Paso 2: Apuntar control remoto Samsung al IR IN del IPEX5002-TVRACK
Paso 3: Presionar Volume Up en el control remoto
Paso 4: Verificar si el TV Samsung recibe la señal (IR OUT → TV)
```

#### Sub-fase 2B: Loopback con `join all`

```
Paso 1: join all <encoder_rack> TVRACK
Paso 2: Repetir el procedimiento de 2A
```

#### Sub-fase 2C: ¿`join av` también enruta IR?

```
Paso 1: join av <encoder_rack> TVRACK (sin join ir explícito)
Paso 2: Repetir el procedimiento de 2A
Paso 3: Documentar si el IR viaja por la ruta de video o no
```

---

### Fase 3 — Flujo inverso: rack → bar

**Hipótesis**: Enviar comandos IR desde el rack hacia un decoder en el bar.

```
Paso 1: join ir <encoder_rack> <decoder_bar>
Paso 2: send ir <decoder_bar> <pronto_hex_power_on>
Paso 3: Verificar si el TV del bar recibe la señal
```

---

### Notas

- `send ir` NO requiere `join ir` — emite directamente del IR OUT del decoder especificado
- `join ir` solo es necesario para transportar señales IR A TRAVÉS de la red IP entre encoder y decoder
- El control remoto físico → IR IN del decoder → red IP → IR OUT del encoder es el flujo documentado para control de fuentes (ej: DirecTV)
- El flujo inverso (encoder IR IN → red IP → decoder IR OUT) es la hipótesis a validar en Fase 3
- Los comandos `join ir`, `join all`, `leave ir` no están wrappeados en `arrangerApi.js` — se envían como comandos crudos vía `sendArrangerCommand()`

## Relaciones

- [[../Software/MagicInfo]] — software de digital signage Samsung (instalación en Palermo)
- [[../../Liberty/Controladores/Arranger-IPEXCB]] — controlador central de la matriz AV
- [[../../../API/ArrangerApi]] — API de comandos HTTP hacia el Arranger
- [[../../../API/SendSerial]] — comando `send serial` para enviar bytes RS-232C
- [[../../../Conceptos/StateManagement]] — estado global de la aplicación
- [[../../../Componentes/MatrizVideo]] — asigna fuentes a destinos (TVs)
- [[../../../Componentes/MatrizPreset]] — presets de configuración de la matriz
- [[../../../Conceptos/SistemaPresets]] — persistencia de presets en localStorage
- [[../../DirecTV/Decodificadores/Decodificadores]] — decodificadores DTV1–DTV8
