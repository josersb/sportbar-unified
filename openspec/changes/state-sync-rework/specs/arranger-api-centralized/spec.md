# Delta for arranger-api-centralized

## ADDED Requirements

### Requirement: Proxy único camino

Toda comunicación con el Arranger MUST pasar por el proxy del server (`/api/command/:command/:token`). Ningún cliente SHALL construir URLs directas al Arranger. Las funciones de `arrangerApi.js` que requieran el Arranger SHALL delegar al proxy/broker, no al hardware.

#### Scenario: Comando vía proxy

- GIVEN un componente invoca una función de arrangerApi que cambia estado
- WHEN se ejecuta
- THEN la request va al server (proxy/broker), nunca directo a `192.168.2.254`

## MODIFIED Requirements

### Requirement: Capability-Gated IR Validation

`sendChannelDigits` MUST validar que el dispositivo destino tiene capability `channelControl` antes de enviar IR. Las capabilities SHALL provenir del registro manual `dispositivos.js` (no de detección por `get status`).
(Previously: capabilities derivadas de detección automática vía `getDeviceStatus`)

#### Scenario: DTV7 rechazado (no channelControl)

- GIVEN `dispositivos.js` declara DTV7 con channelControl false
- WHEN sendChannelDigits("DTV7", 1603) es llamado
- THEN lanza error antes de enviar cualquier comando IR

#### Scenario: DTV1 pasa el gate

- GIVEN `dispositivos.js` declara DTV1 con channelControl true
- WHEN sendChannelDigits("DTV1", 1603) es llamado
- THEN los comandos IR se envían normalmente

## REMOVED Requirements

### Requirement: getDeviceStatus — device capability detection

(Reason: `getDeviceStatus` es código muerto (sin consumidores) y el comando `get status` está FW-locked en v1.3.4 (no disponible en hardware real). `reconstructMatrixState` (dev helper) también se elimina. La detección de capabilities pasa a ser manual vía `dispositivos.js`.)
(Migration: eliminar `getDeviceStatus` y `reconstructMatrixState` de `arrangerApi.js`; `registro-dispositivos` declara capabilities manual-only.)
