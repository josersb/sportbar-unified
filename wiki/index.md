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
- [[Componentes/MatrizPreset]] — gestión de 5 presets con estado usado/libre, Cargar/Guardar/Limpiar, sincronización servidor
- [[Componentes/Canales]] — gestión de canales deportivos y favoritos
- [[Componentes/Audio]] — control de audio por zonas (Norte, Centro, Sur)
- [[Componentes/Arranger]] — links directos a la interfaz web del Arranger
- [[Componentes/Portada]] — página de inicio con logo
- [[Componentes/Soporte]] — información de soporte técnico

## APIs y Endpoints

- [[API/ArrangerApi]] — cliente HTTP centralizado: 12 comandos implementados, 67 documentados. Incluye endpoints de presets (`GET/POST/DELETE /api/presets/:n`) y TVRACK
- [[API/IrCodes]] — tabla de códigos IR hexadecimales para cambio de canal dígito a dígito
- [[API/JoinVideo]] — comando `join video` del Arranger: enrutamiento de video independiente
- [[API/JoinAudio]] — comando `join audio` del Arranger: enrutamiento de audio independiente
- [[API/JoinAv]] — comando `join av` del Arranger: enrutamiento combinado video+audio
- [[API/LeaveAv]] — comando `leave av` del Arranger: desconectar audio+video de un decoder
- [[API/SendIr]] — comando `send ir` del Arranger: envío de códigos infrarrojos Pronto HEX
- [[API/SendSerial]] — comando `send serial` del Arranger: envío de datos RS-232
- [[API/GetStatus]] — comando `get status` del Arranger: estado de dispositivo o stream
- [[API/GetDevices]] — comando `get devices` del Arranger: listar dispositivos (nombre + MAC)
- [[API/GetMatrix]] — comando `get matrix` del Arranger: estado completo de la matriz por stream (✅ implementado)
- [[API/GetJoins]] — comando `get joins` del Arranger: consultar encoder suscrito a un decoder (✅ implementado)
- [[API/ArrangerHttpExamples]] — referencia de formatos HTTP GET/POST, seguridad key, ejemplos AJAX/fetch

## Dispositivos Hardware

- [[Dispositivos/Decodificadores]] — catálogo de 8 fuentes de video: 6 DirecTV + 2 encoders IPEX5001
- [[Dispositivos/DirecTV-Decos]] — 6 decodificadores DirecTV físicos (DTV1–DTV6), control IR
- [[Dispositivos/IPEX5001-Encoder]] — transmisor HDMI sobre IP, JPEG2000, PoE
- [[Dispositivos/IPEX5002-Decoder]] — receptor HDMI sobre IP, video wall 16×16
- [[Dispositivos/Arranger-IPEXCB]] — controlador central IPEXCB, API HTTP + TCP
- [[Dispositivos/ZonasAudio]] — 3 zonas de audio (Norte, Centro, Sur) con Tesira DSP
- [[Dispositivos/AHM-32]] — matriz de audio Allen & Heath 32×32 (TCP, sin integrar)
- [[Dispositivos/SQ6]] — consola de mezcla Allen & Heath para eventos en vivo
- [[Dispositivos/Shure-ANI]] — interfaces de audio en red (ANI22/ANI4OUT)
- [[Dispositivos/MagicInfo]] — cartelería digital Samsung (25+ TVs, sin integrar)

## Conceptos

- [[Conceptos/StateManagement]] — Context API + localStorage + handlers de estado
- [[Conceptos/SistemaPresets]] — 5 presets guardables, carga/grabación, persistencia en localStorage
- [[Conceptos/ArrangerPresetLogic]] — lógica condicional de presets del Arranger (if/else, variables, operadores V1.4.0.0)
- [[Conceptos/APIErrorHandling]] — errores documentados de la API del Arranger y su manejo en SportBar
- [[Conceptos/ArrangerEventFlow]] — notificaciones push TCP en tiempo real (notify serial, network, display, source)

## Configuración

- [[Configuracion/ViteProxy]] — proxy de desarrollo `/api` → ARRANGER_HOST, chunks de build, dev server
- [[Configuracion/PnpmSetup]] — pnpm como gestor exclusivo, `.npmrc`, `.nvmrc`, Node 18.17.1
- [[Configuracion/Seguridad]] — helmet, CORS restrictivo, rate limiting, CSP, token cleanup
- [[Configuracion/BranchingStrategy]] — flujo de ramas, worktrees, puertos por entorno

## Historial y Estado

- [[wiki/log|Registro de cambios]] — registro cronológico de operaciones de la wiki
- [[README]] — estado actual del proyecto
- [[Docs/development/roadmap]] — roadmap de features (HTML + PDF)
- [[Docs/referencia-instalacion]] — inventario completo de equipos, IPs y MACs (sin credenciales)
- [Liberty AV Solutions](https://secure.libertycable.com/) — fabricante principal (Arranger, IPEX, periféricos)

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
