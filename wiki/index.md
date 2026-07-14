# SportBar Unified — Wiki

Sistema de documentación interconectada del proyecto SportBar Unified. Cada página documenta una entidad del sistema: componente React, API, dispositivo hardware, concepto o configuración.

## Proyecto

- [[README]] — documentación general del proyecto
- [[AGENTS]] — convenciones de IA, arquitectura y schema de la wiki
- [[log|Log de cambios]] — historial de operaciones de la wiki

## Componentes React

- [[Componentes/App]] — componente raíz, provider del contexto global
- [[Componentes/Contexto]] — definición del estado global y contexto React
- [[Componentes/MatrizVideo]] — control principal de la matriz de video
- [[Componentes/MatrizPreset]] — gestión de 5 presets de configuración
- [[Componentes/Canales]] — gestión de canales deportivos y favoritos
- [[Componentes/Audio]] — control de audio por zonas (Norte, Centro, Sur)
- [[Componentes/Aside]] — panel lateral con estado en tiempo real de decos, audio y video
- [[Componentes/Arranger]] — links directos a la interfaz web del Arranger IPEX5000

## APIs y Endpoints

- [[API/ArrangerApi]] — cliente HTTP para comandos del Arranger (`join av`, `preset load`, `send serial`, `get status`)

## Dispositivos Hardware

- [[Dispositivos/Decodificadores]] — 8 decodificadores DirecTV (DTV1–DTV8)
- [[Dispositivos/ZonasAudio]] — 3 zonas de audio independientes (Norte, Centro, Sur) con procesador Tesira

## Conceptos

- [[Conceptos/StateManagement]] — Context API + localStorage + handlers de estado
- [[Conceptos/SistemaPresets]] — 5 presets guardables, carga/grabación, persistencia en localStorage

## Configuración

- [[Configuracion/ViteProxy]] — proxy de desarrollo `/api` → `192.168.2.254`, chunks de build, dev server
- [[Configuracion/PnpmSetup]] — pnpm como gestor exclusivo, `.npmrc`, `.nvmrc`, Node 18.17.1

## Historial y Estado

- [[wiki/log|Registro de cambios]] — registro cronológico de operaciones de la wiki
- [[README]] — estado actual del proyecto

## Referencias de API

- `API commands/get_status.txt` — documentación del comando `get status` del Arranger
- [[API/ArrangerApi]] — implementación del cliente API en el proyecto

## Sources

*Sin sources ingestados todavía. Los documentos en `API commands/` y `Docs/` están pendientes de ingestión.*

## Decisions

*Sin decisiones documentadas en la wiki. Ver [[AGENTS]] para decisiones de arquitectura registradas.*

## Queries

*Sin queries registradas. Las preguntas frecuentes se documentarán aquí a medida que surjan.*
