# SportBar Unified — Wiki

Sistema de documentación interconectada del proyecto SportBar Unified. Cada página documenta una entidad del sistema: componente React, API, dispositivo hardware, concepto o configuración.

## Proyecto

- [[README]] — documentación general del proyecto
- [[AGENTS]] — convenciones de IA, arquitectura y schema de la wiki
- [[log|Log de cambios]] — historial de operaciones de la wiki

## Componentes React

- [[Componentes/App]] — componente raíz, provider del contexto global
- [[Componentes/Contexto]] — definición del estado global y contexto React
- [[Componentes/Body]] — layout principal con React Router
- [[Componentes/Header]] — cabecera con logo y título
- [[Componentes/Nav]] — barra de navegación con NavLink
- [[Componentes/Aside]] — panel lateral con estado en tiempo real
- [[Componentes/MatrizVideo]] — control de matriz de video (47 destinos, Zonas Adicionales, TVRACK)
- [[Componentes/MatrizPreset]] — gestión de 5 presets de configuración
- [[Componentes/Canales]] — gestión de canales deportivos y favoritos
- [[Componentes/Audio]] — control de audio por zonas (Norte, Centro, Sur)
- [[Componentes/Arranger]] — links directos a la interfaz web del Arranger
- [[Componentes/Portada]] — página de inicio con logo
- [[Componentes/Soporte]] — información de soporte técnico

## APIs y Endpoints

- [[API/ArrangerApi]] — cliente HTTP centralizado: `join av`, `send ir`, `send serial`, `get status`, `sendChannelDigits`
- [[API/IrCodes]] — tabla de códigos IR hexadecimales para cambio de canal dígito a dígito

## Dispositivos Hardware

- [[Dispositivos/Decodificadores]] — catálogo de 8 fuentes de video: 6 DirecTV + 2 encoders IPEX5001
- [[Dispositivos/DirecTV-Decos]] — 6 decodificadores DirecTV físicos (DTV1–DTV6), control IR, conexión a encoders
- [[Dispositivos/IPEX5001-Encoder]] — transmisor HDMI sobre IP, JPEG2000, PoE, IR/RS232/USB passthrough
- [[Dispositivos/IPEX5002-Decoder]] — receptor HDMI sobre IP, video wall 16×16, CEC, idle image
- [[Dispositivos/Arranger-IPEXCB]] — controlador central IPEXCB, API HTTP + TCP, referencia completa de comandos
- [[Dispositivos/ZonasAudio]] — 3 zonas de audio independientes (Norte, Centro, Sur) con procesador Tesira

## Conceptos

- [[Conceptos/StateManagement]] — Context API + localStorage + handlers de estado
- [[Conceptos/SistemaPresets]] — 5 presets guardables, carga/grabación, persistencia en localStorage

## Configuración

- [[Configuracion/ViteProxy]] — proxy de desarrollo `/api` → `192.168.2.254`, chunks de build, dev server
- [[Configuracion/PnpmSetup]] — pnpm como gestor exclusivo, `.npmrc`, `.nvmrc`, Node 18.17.1
- [[Configuracion/Seguridad]] — helmet, CORS restrictivo, rate limiting, CSP, token cleanup

## Historial y Estado

- [[wiki/log|Registro de cambios]] — registro cronológico de operaciones de la wiki
- [[README]] — estado actual del proyecto
- [[Docs/development/roadmap]] — roadmap de features (HTML + PDF)

## Referencias de API

- [[API/ArrangerApi]] — implementación del cliente API y referencia completa de comandos del Arranger
- [[Dispositivos/Arranger-IPEXCB]] — documentación del controlador físico, IP, token, puertos

## Sources

- Manual de instalación IPEX5001 (Liberty AV / DigitaLinx IP) — ingerido 2026-07-15
- Manual de usuario Arranger Digi IP 5000 / IPEXCB — ingerido 2026-07-15
- `API commands/devices_all.txt` — catálogo de dispositivos conectados al Arranger
- `API commands/get_status.txt` — documentación del comando `get status` del Arranger

## Decisions

*Sin decisiones documentadas en la wiki. Ver [[AGENTS]] para decisiones de arquitectura registradas.*

## Queries

*Sin queries registradas. Las preguntas frecuentes se documentarán aquí a medida que surjan.*
