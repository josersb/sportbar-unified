# Referencia de Instalación — Hipódromo de Palermo

> Extraído de `Docs/.env/Diagramas Sistemas Integral HAPSA.pdf`
> Fecha: julio 2026 | **Sin contraseñas ni credenciales**

## Infraestructura General

Red segmentada para transmisión de audio/video en tiempo real. Subred principal: `192.168.2.0/24`. Subred secundaria (audio/control): `192.168.1.0/24`.

### Equipos de red

| Equipo | IP | MAC | Ubicación |
|--------|-----|-----|-----------|
| Router Unifi X | 192.168.2.001 | D0:21:F9:BD:34:07 | Rack Sportbar |
| Netgear M4250 | 192.168.2.236 | E0:46:EE:1C:0C:1C | Rack Batacazo |
| Netgear M4250 | 192.168.2.237 | 34:98:B5:AE:20:22 | Rack Sportbar |
| Netgear M4250 | 192.168.2.239 | E0:46:EE:2A:DE:E7 | Rack Escenario |
| Switch Wifi Mesa Control | 192.168.1.001 | — | Mesa Control |

---

## Audio

### Procesadores

| Equipo | IP | MAC | Ubicación |
|--------|-----|-----|-----------|
| **TESIRA** (procesador DSP) | 192.168.2.252 | 00:90:5E:17:29:A9 | Rack Sportbar |
| **Allen & Heath SQ6** (consola mezcla) | 192.168.1.101 | — | Mesa Control |
| Tablet Control Consola | 192.168.1.102 | — | Mesa Control |

### Interfaces Dante

| IP | MAC | Ubicación |
|-----|-----|-----------|
| 192.168.2.009 | 00:1D:C1:87:52:F8 | Rack Escenario |
| 192.168.2.006 | 00:1D:C1:87:5E:8B | Rack Escenario |
| 192.168.2.187 | 00:1D:C1:8B:E3:C3 | Rack Escenario |
| 192.168.2.005 | 00:1D:C1:96:4F:F4 | Rack Escenario |
| 192.168.2.004 | 00:1D:C1:96:4F:F6 | Rack Escenario |
| 192.168.2.185 | 00:1D:C1:8B:E1:DB | (relevar) |
| 192.168.2.185 | 00:1D:C1:96:50:9D | (relevar) |

### Interfaces Shure ANI

| Equipo | IP | MAC | Ubicación |
|--------|-----|-----|-----------|
| ANI22-XLR-Bunker | 192.168.2.209 | 00:0E:DD:53:9A:60 | Bunker/Welcome |
| ANI22-XLR-Multimedia | 192.168.2.071 | 00:0E:DD:53:99:82 | Sala Multimedia |
| ANI4OUT-XLR-Rack | 192.168.2.073 | 00:0E:DD:53:99:E0 | Rack Sportbar |

### Convertidor

| Equipo | Ubicación |
|--------|-----------|
| MuxLab (Analógico → Dante, 2ch) | Mesa Control |

---

## Video — Encoders IPEX5001 (fuentes)

| ID | Nombre Arranger | IP | MAC | Ubicación |
|----|-----------------|-----|-----|-----------|
| DTV1 | DTV1 | 192.168.2.021 | 34:1B:22:81:97:81 | Rack Sportbar |
| DTV2 | DTV2 | 192.168.2.022 | 34:1B:22:81:97:F2 | Rack Sportbar |
| DTV3 | DTV3 | 192.168.2.230 | 34:1B:22:81:97:28 | Rack Sportbar |
| DTV4 | DTV4 | 192.168.2.024 | 34:1B:22:81:97:80 | Rack Sportbar |
| DTV5 | DTV5 | 192.168.2.025 | 34:1B:22:81:97:6D | Rack Sportbar |
| DTV6 | DTV6 | 192.168.2.026 | 34:1B:22:81:98:25 | Rack Sportbar |
| DTV7 | DTV7 | 192.168.2.027 | 34:1B:22:81:98:— | Rack Sportbar |
| DTV8 | DTV8 | 192.168.2.028 | 34:1B:22:81:98:2F | Rack Sportbar |
| Src-Menos1-MesaControl | — | 192.168.2.243 | 6C:93:08:70:C0:C9 | Mesa Control |
| Src-Menos1-Rack | — | 192.168.2.176 | 6C:93:08:70:C1:9B | Rack Escenario |

## Video — Decoders (destinos)

### TVs Sportbar (decoders IPEX5001/5002)

| ID | IP | MAC |
|----|-----|-----|
| TV01 | 192.168.2.041 | 34:1B:22:81:91:F3 |
| TV02 | 192.168.2.042 | 34:1B:22:81:92:0D |
| TV03 | 192.168.2.043 | 34:1B:22:81:92:19 |
| TV04 | 192.168.2.044 | 34:1B:22:81:92:36 |
| TV05 | 192.168.2.045 | 34:1B:22:81:92:71 |
| TV06 | 192.168.2.046 | 34:1B:22:81:91:60 |
| TV07 | 192.168.2.047 | 34:1B:22:81:92:17 |
| TV08 | 192.168.2.048 | 34:1B:22:81:91:C0 |
| TV09 | 192.168.2.049 | 34:1B:22:81:91:CD |
| TV10 | 192.168.2.050 | 34:1B:22:81:92:6B |
| TV11 | 192.168.2.051 | 34:1B:22:81:92:18 |
| TV12 | 192.168.2.052 | 34:1B:22:81:91:91 |
| TV13 | 192.168.2.053 | 34:1B:22:81:91:AD |
| TV14 | 192.168.2.054 | 34:1B:22:81:92:72 |
| TV15 | 192.168.2.055 | 34:1B:22:81:91:93 |
| TV16 | 192.168.2.056 | 34:1B:22:81:91:56 |
| TV17 | 192.168.2.057 | 34:1B:22:81:91:5C |
| TV18 | 192.168.2.058 | 34:1B:22:81:92:31 |
| TV19 | 192.168.2.059 | 34:1B:22:81:91:F7 |
| TV20 | 192.168.2.060 | 34:1B:22:81:91:9B |
| TV21 | 192.168.2.061 | 34:1B:22:81:92:6E |
| TV22 | 192.168.2.062 | 34:1B:22:81:92:6C |
| TV23 | 192.168.2.063 | 34:1B:22:81:91:89 |
| TV24 | 192.168.2.064 | 34:1B:22:81:91:F0 |
| TV25 | 192.168.2.065 | 34:1B:22:81:91:5E |
| TV26 | 192.168.2.070 | 34:1B:22:81:91:F4 |

### Video Walls

| ID | IP | MAC |
|----|-----|-----|
| VW-Norte | 192.168.2.069 | 34:1B:22:81:91:EF |
| VW-Centro | 192.168.2.068 | 34:1B:22:81:92:56 |
| VW-Sur | 192.168.2.067 | 34:1B:22:81:91:DE |

### TVRACK

| ID | IP | MAC |
|----|-----|-----|
| TVRack | 192.168.2.204 | 34:1B:22:81:91:94 |

### Zonas Adicionales (decoders IPEX5002)

| Nombre Arranger | IP | MAC | Ubicación |
|-----------------|-----|-----|-----------|
| aVip-BarraJoven2-TV08 | 192.168.2.097 | 6C:93:08:71:0B:D0 | Rack Batacazo |
| aVip-BarraJoven2-TV10 | 192.168.2.099 | 6C:93:08:71:0B:D3 | Rack Batacazo |
| aVip-BarraJoven1-TV03 | 192.168.2.093 | 6C:93:08:71:0C:98 | Rack Batacazo |
| a-Menos1-Escenario | 192.168.2.092 | 6C:93:08:71:0C:82 | Rack Escenario |
| a-QMC65-Menos1-TV1 | 192.168.2.010 | 6C:93:08:71:11:E7 | Rack Escenario/Sala |
| a-QMC75-Menos1-TV1 | 192.168.2.180 | 6C:93:08:71:0C:93 | Rack Escenario/Sala |
| a-QMC75-Menos1-TV2 | 192.168.2.181 | 6C:93:08:71:0C:D3 | Rack Escenario/Sala |
| a-QMC65-Menos1-TV2 | 192.168.2.182 | 6C:93:08:71:11:F2 | Rack Escenario/Sala |

---

## Cartelería Digital — Samsung MagicInfo

25+ TVs Samsung para cartelería digital, gestionadas vía MagicInfo. IPs en rango 192.168.2.101–202.

---

## Iluminación y LED

| Equipo | IP | MAC | Ubicación |
|--------|-----|-----|-----------|
| Controlador LED Novastar | 192.168.2.194 | 54:B5:6C:11:46:7E | Rack Escenario |
| CPU Iluminación | 192.168.2.179 | CC:28:AA:0B:45:B9 | Mesa Control |

---

## Estaciones de trabajo

| Equipo | IP | MAC | Ubicación |
|--------|-----|-----|-----------|
| Notebook Control (DESKTOP-MPTG0QD) | 192.168.2.002 | F4:EE:08:F0:8F:21 | Sala Multimedia |
| DESKTOP-EQBR6EJ | 192.168.2.234 | 0C:37:96:A2:8F:14 | (relevar) |

---

## Equipos nuevos en documentación (Docs/equipaments/)

| Equipo | Tipo | Relevancia |
|--------|------|------------|
| **AHM-32** (Allen & Heath) | Matriz de audio 32×32 | ALTA — protocolo TCP documentado. Posible reemplazo/expansión del Tesira |
| **DBX Zone Pro 1260** | Procesador de zonas de audio | MEDIA — podría ser sistema legacy o de backup |
| **Kramer VM-8H** | Splitter de video 1:8 HDMI | BAJA — distribución pasiva de señal |

---

## Software de gestión

| Equipo | Software |
|--------|----------|
| Arranger Liberty | Aplicación web (192.168.2.254) |
| Tesira | Aplicación escritorio |
| Allen & Heath SQ6 | App iOS SQ MixPad |
| Shure ANI | Aplicación web Shure |
| Dante | Dante Controller |
| Samsung MagicInfo | Aplicación web MagicInfo |
| Novastar | V-CAN (escritorio) |
| Netgear M4250 | Aplicación web Netgear |
| Ubiquiti Unifi | Aplicación web Ubiquiti |

---

## Contactos técnicos

- Ing. de Sonido: Julián Scorese — julians@wetechar.com
- Ing. de Electrónica: Juan Manuel Burdet — ingenieria@wetechar.com
