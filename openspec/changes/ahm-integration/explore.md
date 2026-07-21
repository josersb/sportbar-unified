# Exploration: AHM-32 Audio Matrix Integration

## Current State

### Arquitectura de audio actual
El sistema SportBar Unified controla 3 zonas de audio (Norte, Centro, Sur) mediante comandos seriales RS-232 enviados a través del Arranger IPEX5000. El componente `Audio.jsx` usa `sendSerialCommand("DTV1", ...)` para enviar comandos al DSP Tesira. Esto es **rudimentario**: no hay feedback de estado real, no hay sincronización bidireccional, y cada comando es un HTTP GET stateless al Arranger que forwardea al puerto serial.

### Patrón de API existente
`src/api/arrangerApi.js` implementa un patrón HTTP GET stateless:
- `sendArrangerCommand(command)` → `fetch(/api/command/:cmd/:token)` → proxy Express → Arranger
- Timeout de 10s con AbortController
- Sin estado, sin conexión persistente
- Ideal para comandos one-shot como `join av SOURCE DEST`

### Servidor Express actual
`server/server.js` (209 líneas):
- Helmet + CORS restrictivo + rate limiting
- `fetchWithRetry()` con exponential backoff (3 intentos, base 1s)
- Proxy genérico `/api/command/:command/:token` → Arranger
- Endpoint `/api/device/:id/status` para estado de dispositivos
- Persistencia de estado vía lowdb (`/api/state` GET/POST)
- Sirve archivos estáticos de `dist/` en producción

### Estado en el frontend
`Contexto.jsx` define `estadoInicial.audio` como un array de 3 objetos `{nombreZona, fuenteAudio, volumen, mute}`. El estado se persiste en localStorage y opcionalmente en el servidor vía `/api/state`. `handleChangeEstadoAudio` actualiza el estado local y luego dispara comandos seriales al Arranger — **sin garantía de que el hardware refleje el estado mostrado en UI**.

---

## Affected Areas

| Archivo | Rol actual | Impacto |
|---------|-----------|---------|
| `server/server.js` | Express server con proxy Arranger | **ALTO** — Agregar WebSocket server + TCP bridge al AHM |
| `src/componentes/Audio.jsx` | UI de control de audio (3 zonas) | **ALTO** — Reemplazar `sendSerialCommand` con API WebSocket |
| `src/contexto/Contexto.jsx` | Estado global (incluye `audio[]`) | **MEDIO** — El estado `audio` actual convive o migra a nuevo contexto |
| `src/contexto/dispositivos.js` | Catálogo de dispositivos IPEX5001 | **BAJO** — Agregar entrada AHM-32, sin modificar existentes |
| `src/App.jsx` | Provider raíz | **BAJO** — Agregar `ContextoAHM` provider |
| `src/api/arrangerApi.js` | API HTTP para Arranger | **NO TOCAR** — El AHM usa TCP/MIDI, no HTTP |
| `vite.config.js` | Proxy de desarrollo | **BAJO** — Agregar proxy `/ws` para WebSocket en dev |

### Archivos NUEVOS a crear

| Archivo | Propósito |
|---------|-----------|
| `server/ahm-bridge.js` | Módulo de conexión TCP al AHM + parser MIDI + message queue |
| `server/ws-server.js` | WebSocket server que bridgea browser ↔ AHM |
| `src/api/ahmApi.js` | Cliente WebSocket en el frontend (reemplaza `sendSerialCommand` para audio) |
| `src/contexto/ContextoAHM.jsx` | Contexto React específico para estado del AHM |
| `src/hooks/useAhm.js` | Hook consumidor del contexto AHM |

### Archivos que NO se tocan (aislamiento)

| Archivo | Razón |
|---------|-------|
| `src/api/arrangerApi.js` | El Arranger sigue funcionando para video vía HTTP |
| `src/componentes/MatrizVideo.jsx` | Control de video no cambia |
| `src/componentes/Canales.jsx` | Canales no cambian |
| `src/componentes/MatrizPreset.jsx` | Presets de video no cambian (presets de audio serán Fase 3+) |
| `src/contexto/Contexto.jsx` (parte video) | `tvs`, `decos`, `dispositivos` no se modifican |

---

## Approaches

### 1. Protocolo TCP + MIDI: Implicaciones y patrones Node.js

**Diagnóstico**: El AHM-32 usa TCP persistente en puerto 51325 (sin TLS) o 51327 (con TLS), con mensajes MIDI como formato de comunicación. Esto es fundamentalmente diferente al patrón HTTP GET stateless actual.

**Implicaciones**:
- **Conexión persistente**: El servidor Express debe mantener un `net.Socket` abierto al AHM durante toda la vida útil del servidor.
- **Autenticación en connect**: Al abrir TLS (recomendado), enviar `UserProfile,UserPassword` como string. Esperar `"AuthOK"` (6 bytes) antes de enviar comandos.
- **Mensajería binaria**: MIDI no es texto. Los mensajes son secuencias de bytes. No se puede usar `fetch()` ni `encodeURIComponent`.
- **Bidireccionalidad**: El AHM envía respuestas y notificaciones (Get Channel Level, SysEx responses). El servidor debe leer del socket continuamente.
- **Heartbeat**: TCP idle puede ser cerrado por firewalls/NAT. Se necesita keep-alive periódico (ej: `get status` o un comando innocuo cada 30s).

**Patrones Node.js recomendados**:

```javascript
// server/ahm-bridge.js — Patrón de conexión TCP con reconexión
const net = require("net");
const { EventEmitter } = require("events");

class AhmBridge extends EventEmitter {
  constructor(host, port = 51327, profile = "00", password = "") {
    super();
    this.host = host;
    this.port = port;
    this.profile = profile;
    this.password = password;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
    this.pendingCommands = [];
    this.connected = false;
    this.reconnectDelay = 1000;
  }

  connect() {
    this.socket = net.createConnection({ host: this.host, port: this.port });
    
    this.socket.on("connect", () => {
      // Enviar autenticación
      this.socket.write(`${this.profile},${this.password}\n`);
    });

    this.socket.on("data", (chunk) => {
      this.buffer = Buffer.concat([this.buffer, chunk]);
      this.processBuffer(); // Parsear mensajes MIDI completos
    });

    this.socket.on("close", () => {
      this.connected = false;
      this.emit("disconnected");
      this.scheduleReconnect();
    });

    this.socket.on("error", (err) => {
      this.emit("error", err);
    });

    // Heartbeat cada 30s
    this.heartbeat = setInterval(() => this.sendHeartbeat(), 30000);
  }

  processBuffer() {
    // Parsear mensajes MIDI: Note On/Off, NRPN, SysEx
    // Emitir eventos: "level", "mute", "auth", etc.
  }

  sendMidiCommand(bytes) {
    if (!this.connected) {
      this.pendingCommands.push(bytes);
      return;
    }
    this.socket.write(Buffer.from(bytes));
  }

  scheduleReconnect() {
    setTimeout(() => this.connect(), this.reconnectDelay);
    this.reconnectDelay = Math.min(this.reconnectDelay * 2, 30000);
  }
}
```

**Alternativa**: Usar `tls.connect()` en lugar de `net.createConnection()` para el puerto 51327 con TLS. Recomendado para producción porque la autenticación va en plaintext en el puerto 51325.

**Complejidad**: Media. El parser MIDI es el componente más delicado.

---

### 2. Patrón de integración: WebSocket Bridge

**Diagnóstico**: El browser no puede abrir sockets TCP crudos. La arquitectura correcta es:

```
Browser ←──WebSocket──→ Express Server ←──TCP/MIDI──→ AHM-32
```

**Librerías evaluadas**:

| Librería | Pros | Cons | Peso |
|----------|------|------|------|
| `ws` | Ligero (2MB), API simple, sin dependencias, ampliamente usado | Sin reconexión automática, sin rooms nativos | ⭐ |
| `socket.io` | Auto-reconnect, rooms, fallback a HTTP long-polling, eventos tipados | Más pesado (6MB), requiere cliente específico, abstracción innecesaria para este caso | ⭐⭐⭐ |
| `µWebSockets.js` | Extremadamente rápido (C++), baja latencia | Compilación nativa, complejo de instalar en Windows | ⭐⭐ |

**Recomendación**: `ws` (npm: `ws@8.x`). Es lo que Express recomienda, es mínimo, y el proyecto ya valora simplicidad (sin dependencias innecesarias). La reconexión se maneja en el frontend con un wrapper simple.

**Mensajería WebSocket — formato**:
```json
// Browser → Server (comandos)
{ "type": "mute", "channel": 0, "zone": 0, "value": true }
{ "type": "level", "channel": 0, "zone": 0, "value": -21.5 }

// Server → Browser (estado)
{ "type": "state", "channel": 0, "zone": 0, "level": -21.5, "mute": false }
{ "type": "connected", "value": true }
{ "type": "error", "message": "AHM unreachable" }
```

**Arquitectura del bridge en Express**:

```
server/server.js
  ├── app (Express)
  ├── wss (WebSocket.Server)      ← NUEVO
  │     └── ahmBridge (AhmBridge) ← NUEVO, singleton
  └── HTTP routes (sin cambios)
```

El `wss` y `ahmBridge` comparten el mismo proceso Express. Cuando el AHM notifica un cambio de nivel, `ahmBridge` emite un evento → `wss` lo forwardea a todos los clientes WebSocket conectados. Cuando un browser envía un comando, `wss` lo forwardea al `ahmBridge` que lo traduce a MIDI y lo envía al AHM.

**Manejo de múltiples clientes**:
- Cada cliente WebSocket recibe el estado completo al conectarse
- Los comandos de cualquier cliente se aplican y se broadcast a todos
- Si dos clientes envían comandos conflictivos, el último comando gana (last-write-wins)
- El AHM es la fuente de verdad: después de enviar un comando, se lee el estado real del AHM y se broadcast

**Complejidad**: Media. La parte más desafiante es el message queue cuando el AHM está desconectado.

---

### 3. Topología de comunicación: Validación

**¿Por qué WebSocket y no otra cosa?**

| Alternativa | ¿Funciona? | Por qué no |
|-------------|-----------|------------|
| HTTP polling | ✅ Técnicamente | Latencia, overhead, no recibe notificaciones del AHM en tiempo real |
| SSE (Server-Sent Events) | 🟡 Parcial | Solo servidor→cliente. Para comandos necesitarías HTTP POST aparte. Dos canales. |
| WebRTC | ❌ | Overkill. Requiere STUN/TURN. El AHM no es un peer WebRTC. |
| gRPC-Web | ❌ | El AHM no habla gRPC. Requiere proxy Envoy extra. Complejidad injustificada. |
| Direct TCP desde browser | ❌ | No existe API en browsers. Solo Chrome Apps (deprecated) o Electron. |

**Conclusión**: WebSocket es la opción correcta. Es el único canal full-duplex nativo del browser que permite recibir notificaciones en tiempo real y enviar comandos.

**Validación de red**: El servidor Express tiene acceso a ambas redes (192.168.2.x para Arranger, y la "red multim" donde está el AHM). La topología es:
- Puerto Control del AHM (51325/51327) → red multim → Express server
- Puerto Dante del AHM (Primary/Secondary) → red 192.168.2.x → solo transporte audio
- Browser → WebSocket (mismo puerto que Express, 3000) → Express → TCP AHM

Esto significa que **no se necesita exponer el AHM al browser ni al mundo exterior**. Solo Express necesita acceso IP al AHM.

---

### 4. Estado y sincronización

**Modelo actual**: Fire-and-forget. `Audio.jsx` actualiza el estado React → envía comandos seriales → asume que funcionó. No hay verificación.

**Modelo propuesto**: Event-driven con polling de respaldo.

```
┌─────────┐   command    ┌──────────┐   MIDI     ┌─────────┐
│ Browser │─────────────→│ Express  │───────────→│  AHM-32 │
│         │←─────────────│ (Bridge) │←───────────│         │
└─────────┘   state sync └──────────┘  response  └─────────┘
```

**Estrategia de sincronización**:

1. **Comando → Verificación**: El browser envía un comando (ej: set level Zone 1 = -20dB). Express lo forwardea al AHM vía MIDI NRPN. Luego Express envía un `Get Channel Level` (SysEx) para esa zona. El AHM responde con el valor real. Express forwardea el valor real al browser. **Esto cierra el loop de feedback**.

2. **Broadcast de cambios**: Cuando cualquier cliente cambia un nivel/mute, Express hace broadcast del nuevo estado a TODOS los clientes conectados. Esto mantiene múltiples pantallas sincronizadas.

3. **Estado inicial en connect**: Cuando un browser se conecta vía WebSocket, Express consulta el estado actual de todas las zonas configuradas al AHM y envía un snapshot completo.

4. **Polling de respaldo**: Cada 30 segundos (coincidiendo con el heartbeat), Express consulta el estado de todas las zonas. Si detecta una discrepancia con el último estado conocido, hace broadcast de la corrección. Esto cubre cambios hechos desde el panel físico del AHM.

**Formato del estado en el frontend**:

```javascript
// ContextoAHM — estado mantenido en React
{
  connected: true,          // ¿Hay conexión TCP al AHM?
  zones: {
    norte: { level: -21.0, mute: false, source: null },
    centro: { level: -23.0, mute: false, source: null },
    sur: { level: -21.0, mute: false, source: null }
  },
  lastSync: "2026-07-21T10:30:00Z"
}
```

**Ventaja clave**: El estado en React es **derivado** del estado real del AHM, no al revés. Si el AHM dice que Zone 1 está en -25dB, eso es lo que muestra la UI, sin importar lo que diga localStorage.

**¿Polling vs Event-driven?** La respuesta es AMBOS. Event-driven para comandos del browser (baja latencia), polling ligero como safety net para cambios externos (panel físico, otro operador).

---

### 5. Arquitectura en el frontend

**Diagnóstico**: `Contexto.jsx` ya maneja 4 dominios (decos, dispositivos, tvs, audio) con 5 handlers distintos. Agregar el estado del AHM ahí crearía un "god context" difícil de mantener.

**Recomendación**: **Contexto separado (`ContextoAHM`)**.

```
src/App.jsx
  └── ThemeProvider
       └── ProviderUser (Contexto.jsx)     ← video, decos, presets existentes
            └── ProviderAHM (ContextoAHM)   ← NUEVO: audio AHM
                 └── ToastProvider
                      └── Body
```

**Por qué contexto separado**:
1. **Principio de responsabilidad única**: Video y audio son dominios independientes con hardware diferente.
2. **Re-renders aislados**: Un cambio de volumen no debería re-renderizar la matriz de video.
3. **Ciclo de vida diferente**: El contexto AHM necesita inicializar conexión WebSocket, manejar reconexión, y limpiar al desmontar. `Contexto.jsx` es puro state + localStorage.
4. **Extensibilidad**: Fase 2 (Source Selector), Fase 3 (Presets, EQ) agregan más estado al AHM sin tocar el contexto de video.
5. **Testing**: Contextos separados son más fáciles de mockear y testear independientemente.

**API del frontend**:

```javascript
// src/api/ahmApi.js — WebSocket client
class AhmClient {
  constructor(url = `ws://${location.host}/ws/ahm`) {
    this.ws = null;
    this.listeners = new Map();
    this.reconnectTimer = null;
  }

  connect() { /* WebSocket + reconexión */ }
  disconnect() { /* cleanup */ }
  
  // Comandos
  setMute(zone, value)    { this.send({ type: "mute", zone, value }); }
  setLevel(zone, value)   { this.send({ type: "level", zone, value }); }
  
  // Eventos
  on(event, callback) { /* listener */ }
  off(event, callback) { /* listener */ }
}

// src/contexto/ContextoAHM.jsx — React context
const ContextoAHM = React.createContext();

function ProviderAHM({ children }) {
  const [ahmState, setAhmState] = useState(initialAhmState);
  const clientRef = useRef(null);

  useEffect(() => {
    const client = new AhmClient();
    client.connect();
    client.on("state", (state) => setAhmState(state));
    client.on("connected", (val) => setAhmState(prev => ({...prev, connected: val})));
    clientRef.current = client;
    return () => client.disconnect();
  }, []);

  const setMute = (zone, val) => clientRef.current?.setMute(zone, val);
  const setLevel = (zone, val) => clientRef.current?.setLevel(zone, val);

  return (
    <ContextoAHM.Provider value={{ ahmState, setMute, setLevel }}>
      {children}
    </ContextoAHM.Provider>
  );
}
```

**¿Qué pasa con el `audio[]` actual en `Contexto.jsx`?**

Opción A: **Mantenerlo como fallback** — Si el AHM no está disponible, `Audio.jsx` puede degradar gracefulmente al control serial existente. Esto requiere mantener ambos caminos de código.

Opción B: **Migrarlo completamente** — El `audio[]` en `Contexto.jsx` se marca como `@deprecated` y `Audio.jsx` solo usa `ContextoAHM`. Si el AHM no está, la UI muestra "Audio no disponible".

**Recomendación**: Opción B para Fase 1. La meta es reemplazar el sistema serial rudimentario, no mantener dos sistemas en paralelo. Si el AHM no está, la UI lo indica claramente y no permite enviar comandos.

---

### 6. Impacto detallado en archivos existentes

#### `server/server.js` — Cambios

```
ANTES:                              DESPUÉS:
app = express()                     app = express()
app.use(helmet(...))                app.use(helmet(...))
app.use(cors...)                    app.use(cors...)
GET /api/state                      GET /api/state
POST /api/state                     POST /api/state
GET /api/device/:id/status          GET /api/device/:id/status
GET /api/command/:command/:token    GET /api/command/:command/:token
app.use(static)                     app.use(static)
app.get("*")                        app.get("*")
app.listen(3000)                    
                                    // NUEVO
                                    wss = new WebSocket.Server({ server })
                                    ahmBridge = new AhmBridge(AHM_HOST, AHM_PORT)
                                    ahmBridge.on("state", broadcast)
                                    wss.on("connection", handleClient)
                                    
                                    server = app.listen(3000)  // server, no app
```

**Cambios específicos**:
1. Importar `ws` y `ahm-bridge.js`
2. Crear `http.createServer(app)` para compartir con WebSocket (Express 4 no tiene `.server` nativo como Express 5 — se crea manualmente con `http.createServer(app)` y luego `server.listen(3000)`)
3. Agregar WebSocket upgrade handler
4. Inicializar `AhmBridge` con variables de entorno (`AHM_HOST`, `AHM_PORT`, `AHM_PROFILE`, `AHM_PASSWORD`)
5. Agregar graceful shutdown (cerrar socket AHM + WebSocket al recibir SIGTERM)

**Lo que NO cambia**: Todas las rutas HTTP existentes, helmet, CORS, rate limiting, static files, SPA fallback.

#### `src/componentes/Audio.jsx` — Cambios

El componente actual usa `sendSerialCommand` vía Arranger. Se reemplaza completamente la lógica de submit:

```javascript
// ANTES: onSubmit llama sendSerialCommand("DTV1", ...)
// DESPUÉS: onSubmit llama setMute(zone, val) y setLevel(zone, val) del contexto AHM

const { ahmState, setMute, setLevel } = useContext(ContextoAHM);

onSubmit = async (values) => {
  if (!ahmState.connected) {
    toast.error("AHM-32 no disponible");
    return;
  }
  setMute("norte", values.muteNorte);
  setLevel("norte", values.volumenNorte);
  // ... etc.
};
```

El JSX del formulario se mantiene prácticamente igual. La diferencia es qué función se llama en submit.

**Mejora de UX**: Agregar indicador visual de conexión AHM (`● Conectado` / `○ Desconectado`).

#### `src/contexto/Contexto.jsx` — Cambios

**Mínimo**. El array `audio` en `estadoInicial` se marca como `@deprecated` pero se mantiene para no romper la migración de estado. `handleChangeEstadoAudio` se mantiene pero `Audio.jsx` deja de llamarlo (o lo llama como fallback silencioso).

**Alternativa más limpia**: Eliminar `audio` del estado inicial y `handleChangeEstadoAudio`. Como el estado se persiste en localStorage, se necesita una migración que remueva la key `audio` de datos cacheados. Esto es más trabajo pero más limpio a largo plazo.

#### `src/contexto/dispositivos.js` — Cambios

Agregar entrada para el AHM-32:

```javascript
AHM32: {
  id: 'AHM32',
  hardware: 'AHM-32',
  connected: 'Allen & Heath AHM-32 Audio Matrix Processor',
  provider: 'Allen & Heath',
  defaultChannel: null,
  color: '#FF8C00',
  fallbackCapabilities: ['audioProcessor', 'zoneControl', 'levelControl', 'muteControl', 'presetRecall', 'sourceSelect'],
}
```

#### `src/App.jsx` — Cambios

Agregar `ProviderAHM` en la jerarquía de providers. Sin modificar providers existentes.

---

### 7. Riesgos y edge cases

#### Riesgo 1: AHM inalcanzable o caído
- **Impacto**: Sin audio. La UI no puede enviar comandos.
- **Mitigación**: `AhmBridge` reconecta automáticamente con backoff exponencial (1s → 2s → 4s → ... → 30s max). La UI muestra indicador de desconexión. El WebSocket notifica a todos los clientes.
- **Degradación**: Si se desea, mantener el path serial como fallback temporal. Pero esto duplica código.

#### Riesgo 2: Múltiples clientes web concurrentes
- **Impacto**: Dos operadores cambiando volumen simultáneamente.
- **Mitigación**: Last-write-wins. Cada comando se envía inmediatamente al AHM. El AHM responde con el estado real post-comando. Todos los clientes reciben el broadcast del estado real. No hay race condition porque el AHM serializa los comandos TCP.
- **Edge case**: Si dos clientes envían comandos con <10ms de diferencia, el AHM los procesa en orden. El broadcast refleja el estado final.

#### Riesgo 3: Parsing de mensajes MIDI
- **Impacto**: El AHM envía respuestas MIDI que deben parsearse correctamente. Un byte mal interpretado = estado incorrecto en UI.
- **Mitigación**: El parser MIDI debe manejar running status (un mensaje MIDI puede omitir el status byte si es igual al anterior). Debe acumular bytes hasta tener un mensaje completo (Note On = 3 bytes, NRPN = 12+ bytes, SysEx = delimitado por F0...F7). Testing con mensajes capturados del protocolo real.

#### Riesgo 4: Conexión TCP idle cerrada por firewall/NAT
- **Impacto**: El socket se cae sin error aparente hasta que se intenta enviar un comando.
- **Mitigación**: Heartbeat cada 30 segundos. Si el heartbeat falla, se fuerza reconexión. El heartbeat puede ser un `Get Channel Level` de una zona dummy (si existe) o un mensaje innocuo que el AHM ignore pero mantenga el socket vivo.

#### Riesgo 5: Latencia de red
- **Impacto**: Si la red multim tiene latencia alta, los comandos de mute/volumen pueden tardar >100ms en aplicarse.
- **Mitigación**: El AHM tiene latencia <1ms internamente, pero la red puede agregar 5–50ms. La UI debe mostrar feedback inmediato optimista (ej: el slider se mueve, el mute se muestra activado) y luego confirmar con el estado real del AHM. Si hay discrepancia, revertir.

#### Riesgo 6: Reconexión y pérdida de comandos
- **Impacto**: Si el AHM se desconecta mientras hay comandos en vuelo, esos comandos se pierden.
- **Mitigación**: `AhmBridge` mantiene una cola de comandos pendientes. Al reconectar, reenvía los comandos pendientes (con deduplicación — si un comando de nivel fue sobrescrito por otro más reciente, solo se envía el más reciente).

#### Riesgo 7: Autenticación fallida
- **Impacto**: Si el perfil/contraseña son incorrectos, el AHM cierra la conexión inmediatamente.
- **Mitigación**: `AhmBridge` detecta que la conexión se cerró sin recibir "AuthOK" y loggea el error claramente. No reintenta indefinidamente con credenciales inválidas — requiere intervención.

#### Riesgo 8: Dependencia de `ws` en server CommonJS
- **Impacto**: `ws` es ESM-first en versiones recientes. El server usa CommonJS.
- **Mitigación**: Instalar `ws@8.18.x` que aún soporta `require()`. Verificar compatibilidad con Node 18.17.1. Alternativa: usar import dinámico `await import("ws")`.

---

### 8. Fase 1 vs Extensibilidad

**Fase 1 (este cambio)**: Mute + Level para 3 zonas (Norte, Centro, Sur).

**Fases futuras planeadas**:
- Fase 2: Source Selector (elegir fuente de audio por zona)
- Fase 3: Preset Recall (cargar/configurar presets del AHM)
- Fase 4: EQ, Room Combiners, Audio Playback
- Fase 5: Control Groups, Input Trim, Preamp

**Cómo diseñar para extensibilidad desde Fase 1**:

1. **MIDI Message Factory en `ahm-bridge.js`**:
```javascript
// server/ahm-midi.js — Factory de mensajes MIDI
const MidiCommands = {
  mute: (channel, zone, value) => {
    const n = 1; // Zones
    const ch = zone; // 00-3F
    const vel = value ? 0x7F : 0x3F;
    return [0x90 | n, ch, vel, 0x90 | n, ch, 0x00];
  },
  level: (channel, zone, value) => {
    const n = 1;
    const ch = zone;
    const lv = dbToMidi(value); // -inf..+10dB → 0x00..0x7F
    return [0xB0 | n, 0x63, ch, 0xB0 | n, 0x62, 0x17, 0xB0 | n, 0x06, lv];
  },
  getLevel: (channel, zone) => {
    // SysEx: F0 00 00 1A 50 12 01 00 01 0B 17 CH F7
    return [0xF0, 0x00, 0x00, 0x1A, 0x50, 0x12, 0x01, 0x00, 
            channel, 0x01, 0x0B, 0x17, zone, 0xF7];
  },
  // Fase 2: sourceSelector, getSourceSelector
  // Fase 3: presetRecall
  // Fase 4: eq, roomCombine
  // ...
  
  // Registrar nuevos comandos sin modificar el bridge
  register(name, handler) { /* ... */ }
};
```

2. **Command Registry en WebSocket handler**:
```javascript
// server/ws-server.js
const COMMAND_HANDLERS = {
  mute: (ahm, { zone, value }) => ahm.setMute(zone, value),
  level: (ahm, { zone, value }) => ahm.setLevel(zone, value),
  // Fase 2: source → ahm.setSource(...)
  // Fase 3: preset → ahm.recallPreset(...)
};

wss.on("connection", (ws) => {
  ws.on("message", (data) => {
    const msg = JSON.parse(data);
    const handler = COMMAND_HANDLERS[msg.type];
    if (handler) handler(ahmBridge, msg);
  });
});
```

3. **Estado extensible en `ContextoAHM`**:
```javascript
// Estructura que escala con nuevas funcionalidades
const initialAhmState = {
  connected: false,
  zones: {},        // { norte: { level, mute, source?, eq? } }
  presets: [],      // Fase 3
  sources: [],      // Fase 2
  rooms: [],        // Fase 4
};
```

4. **Canales MIDI mapeados por configuración**:
```javascript
// En lugar de hardcodear zone=0,1,2 para Norte,Centro,Sur:
const AHM_ZONE_MAP = {
  norte: { channel: 0, zone: 0 },   // MIDI: N=1, CH=00
  centro: { channel: 0, zone: 1 },  // MIDI: N=1, CH=01
  sur: { channel: 0, zone: 2 },     // MIDI: N=1, CH=02
};
// Agregar una zona nueva en Fase 2 es solo agregar una entrada a este mapa
```

**Principio**: Cada nueva funcionalidad agrega un handler en `COMMAND_HANDLERS`, un método en `MidiCommands`, y opcionalmente un campo en `ahmState`. Nada de esto requiere modificar el bridge TCP, el WebSocket server, o el contexto React existente. Solo se extienden.

---

## Recommendation

### Arquitectura recomendada

```
                        ┌──────────────────────────────────────┐
                        │           Express Server             │
                        │                                      │
  Browser ──WebSocket──→│  ws-server.js ←──→ ahm-bridge.js ──→│ AHM-32
  (React)               │      ↑                ↑    TCP:51327 │
                        │      │                │              │
                        │  HTTP routes    ahm-midi.js          │
                        │  (sin cambios)  (message factory)    │
                        └──────────────────────────────────────┘
```

**Stack técnico**:
- `ws@8.x` en el server (CommonJS compatible con Node 18.17.1)
- `net` module nativo de Node para TCP (sin dependencias extra)
- Parser MIDI custom (~150 líneas) — más ligero que `easymidi` o `jzz`
- WebSocket nativo en el browser (sin `socket.io-client`, sin dependencias)
- React Context separado (`ContextoAHM`)

**Lo que NO se toca**:
- `arrangerApi.js`, `MatrizVideo.jsx`, `Canales.jsx` — el control de video sigue funcionando exactamente igual
- Las rutas HTTP existentes en Express
- La persistencia `lowdb` para estado general (el estado AHM es volátil, no se persiste en archivo porque el AHM es fuente de verdad)

### Por qué esta arquitectura y no otra

| Decisión | Alternativa rechazada | Razón |
|----------|----------------------|-------|
| Contexto separado | Extender Contexto.jsx | SRP, re-renders aislados, extensibilidad |
| `ws` sobre `socket.io` | socket.io | Menos dependencias, más ligero, sin abstracciones innecesarias |
| Parser MIDI propio | easymidi, jzz | Menos dependencias nativas que pueden fallar en Windows |
| WebSocket bridge | Polling HTTP | Full-duplex necesario para notificaciones del AHM |
| Last-write-wins | Distributed consensus | Overkill para 3–5 clientes web en una LAN |
| Sin persistencia de estado AHM | Guardar en lowdb/lStorage | El AHM es fuente de verdad; persistir duplicados causa desync |

---

## Ready for Proposal

**Sí**. La exploración confirma que:
1. WebSocket bridge es la arquitectura correcta
2. TCP persistente + MIDI es manejable con `net` nativo + parser custom
3. Un contexto React separado (`ContextoAHM`) es la opción más limpia
4. El impacto en archivos existentes es acotado y bien definido
5. Los riesgos están identificados con mitigaciones claras
6. La arquitectura escala limpiamente a fases futuras (Source Selector, Presets, EQ)

**Prerrequisitos para la propuesta**:
- Necesito confirmar: ¿IP del AHM en la red multim? ¿Perfil y contraseña?
- ¿Las 3 zonas existen como Zones 1-3 en el AHM o con otros índices?
- ¿Se usa TLS (puerto 51327) o plain TCP (51325)?

**Lo que el orchestrator debe decirle al usuario**:
"La exploración está completa. El AHM-32 requiere una arquitectura fundamentalmente diferente al Arranger: TCP persistente en lugar de HTTP stateless, con un bridge WebSocket en Express. Recomiendo contexto React separado para audio. ¿Avanzamos a la propuesta formal con `sdd-propose`? Antes necesito confirmar: IP del AHM, perfil/contraseña, y mapeo de zonas."

---

## Technical Notes

### Dependencias nuevas requeridas

**Server** (`server/package.json`):
```json
"dependencies": {
  "ws": "8.18.2"
}
```

**Frontend** (`package.json`):
*Sin dependencias nuevas.* WebSocket es nativo en browsers modernos. React Context ya está disponible.

### Variables de entorno nuevas

```bash
# .env (server)
AHM_HOST=192.168.x.x          # IP del AHM en red multim
AHM_PORT=51327                 # 51325 sin TLS, 51327 con TLS
AHM_PROFILE=00                 # UserProfile (00 a 1F)
AHM_PASSWORD=                  # UserPassword
AHM_HEARTBEAT_MS=30000         # Intervalo de keep-alive
AHM_RECONNECT_MAX_MS=30000     # Máximo backoff de reconexión

# .env (frontend, Vite)
VITE_WS_URL=ws://localhost:3000/ws/ahm  # URL del WebSocket
```

### Configuración Vite adicional

```javascript
// vite.config.js — agregar proxy WebSocket en dev
server: {
  proxy: {
    "/ws": {
      target: "http://localhost:3000",
      ws: true,  // ← WebSocket proxy
    },
    // ... proxies existentes sin cambios
  }
}
```
