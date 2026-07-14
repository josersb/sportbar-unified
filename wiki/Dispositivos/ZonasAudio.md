# ZonasAudio

Tres zonas de audio independientes que cubren el SportBar: Norte, Centro y Sur. Controladas mediante el procesador de audio **Tesira** a través de comandos seriales enviados por la [[../API/ArrangerApi]].

## Zonas

| Zona | Fuente por defecto | Volumen por defecto | Mute por defecto |
|------|-------------------|---------------------|------------------|
| Norte | DTV1 | -21 dB | false |
| Centro | DTV1 | -23 dB | false |
| Sur | DTV1 | -21 dB | false |

## Comandos Tesira

El control de audio no usa el protocolo estándar `join av` de la matriz, sino que envía comandos seriales al procesador Tesira a través del Arranger. Cada zona tiene 3 controles independientes:

### Mute por zona
- `Mute1` → Zona Norte
- `Mute2` → Zona Centro
- `Mute3` → Zona Sur

Comando: `"MuteX set mute 1 [true|false]\x0A"`

### Volumen por zona
- `Level3` → Zona Norte  
- `Level4` → Zona Centro
- `Level5` → Zona Sur

Comando: `"LevelX set level 1 [valor]\x0A"`  
Rango: -40 a 0 dB

### Fuente de audio por zona
- `SourceSelector1` → Zona Norte
- `SourceSelector2` → Zona Centro
- `SourceSelector3` → Zona Sur

Comando: `"SourceSelectorX set sourceSelection [XX]\x0A"`  
El valor se extrae del nombre del deco: `DTV1` → `1`, `DTV2` → `2`, etc.

## Flujo de control

1. El usuario ajusta fuente, volumen y/o mute en el componente [[../Componentes/Audio]]
2. El formulario Formik hace submit con los 9 valores (3 zonas × 3 controles)
3. Se envían 9 comandos `send serial` secuenciales al Arranger
4. El Arranger reenvía los comandos al Tesira por puerto serial
5. El estado se persiste en React y en la key `estadoApp` de localStorage

## Monitoreo

El componente [[../Componentes/Aside]] muestra en tiempo real:
- Zona (Sur, Centro, Norte)
- Fuente de audio (deco asignado)
- Nivel de volumen en dB
- Estado de mute (ON/OFF)

## Relaciones

- [[../API/ArrangerApi]] — comandos `send serial`
- [[../Componentes/Audio]] — interfaz de control
- [[../Componentes/Aside]] — panel de monitoreo
- [[../Dispositivos/Decodificadores]] — fuentes de audio
- [[../Conceptos/StateManagement]] — persistencia del estado
- [[../README]] — documentación general
- [[../AGENTS]] — schema de la wiki
