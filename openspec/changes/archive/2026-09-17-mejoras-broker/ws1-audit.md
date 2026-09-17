# WS1 — Auditoría de identidad de dispositivo (read-only)

**Fecha**: 2026-09-14
**Método**: consulta **read-only** `get devices all` al Arranger real (`192.168.2.254:80`, token desde `VITE_ARRANGER_TOKEN`). Sin comandos de escritura.
**Comparado contra**: captura `API commands/devices_all.txt` (actualizada 14-02-2026) y el modelo del proyecto (`server/broker/destinations.js`, `server/broker/matrixModel.js`, `src/data/tvGroups.js`).

## Salida cruda del Arranger (49 dispositivos)

```text
get devices success [TV17-341B2281915C, TV25-341B2281915E, TV06-341B22819160, TV23-341B22819189, TV12-341B22819191, TV15-341B22819193, TVRACK-341B22819194, TV16-341B2281919A, TV20-341B2281919B, TV13-341B228191AD, TV08-341B228191C0, TV09-341B228191CD, VW-Sur-341B228191DE, VW-Norte-341B228191EF, TV24-341B228191F0, TV01-341B228191F3, TV26-341B228191F4, TV19-341B228191F7, TV02-341B2281920D, TV07-341B22819217, TV11-341B22819218, TV03-341B22819219, TV18-341B22819231, TV04-341B22819236, VW-Centro-341B22819256, TV10-341B2281926B, TV22-341B2281926C, TV21-341B2281926E, TV05-341B22819271, TV14-341B22819272, DTV3-341B22819728, DTV5-341B2281976D, DTV4-341B22819780, DTV1-341B22819781, DTV2-341B228197F2, DTV6-341B22819825, E-OBS_CS-6C930870C0C9, F-STREAMING-CS-6C930870C19B, aVip-Barra-Centro-6C9308710BD0, aVip-Lobby-Batacazo-6C9308710BD3, a-Menos1-Escenario-6C9308710C82, a-QMR75-Menos1-TV1-6C9308710C93, aVip-Bar-Boveda-6C9308710C98, aMas-15-Barra-6C9308710CC6, aMas15-Vwall-Libertador-6C9308710CD2, a-QMR75-Menos1-TV2-6C9308710CD3, a-Menos1-Escenario2-6C93087111E7, a-QMC65-Menos1-TV2-6C93087111F2, RACK-VIP-PANTALLABATACA-6C93087111F4]
```

## Delta vs captura (14-02-2026) y modelo

El Arranger real reporta **49** dispositivos. La captura tiene **48**. La única diferencia:

| Device (Arranger) | MAC | ¿En captura feb-2026? | ¿Modelado? |
| --- | --- | --- | --- |
| `aMas-15-Barra` | `6C9308710CC6` | Sí | **Sí** — zona-fuera #5 (label UI "+15 Barra" / "Mas 15 Barra") |
| `aMas15-Vwall-Libertador` | `6C9308710CD2` | **No** | **NO modelado** |

Todos los demás dispositivos coinciden por nombre y MAC entre Arranger y captura.

## Conclusión

**Son DOS equipos físicos distintos**, no un alias ni un problema de etiqueta:

- `aMas-15-Barra` (`…0CC6`) → ya modelado como zona fuera de sportbar.
- `aMas15-Vwall-Libertador` (`…0CD2`) → **dispositivo real, físicamente presente, NO modelado**. Es el que el usuario no lograba identificar en "Estado de otras zonas" ni en "ZONAS FUERA DE SPORTBAR".

Se agregó al Arranger **después** de la captura de febrero 2026 (por eso no aparece en `devices_all.txt`). El modelo de zonas fuera hoy tiene **10** dispositivos; el Arranger real tiene **11**.

## Follow-up (change aparte — NO implementado acá)

Agregar `aMas15-Vwall-Libertador` como destino de zona fuera (video/audio/link, igual que las otras 10):

- `server/broker/destinations.js` (ZONA_FUERA_IDS).
- `server/broker/store.js` / `openspec/specs/zonas-fuera-state` (estado del nuevo dominio).
- `src/componentes/ZonasFueraStatus.jsx` (Aside "Estado de otras zonas") y `src/componentes/MatrizVideo.jsx` (sección "ZONAS FUERA DE SPORTBAR").
- Verificar nombre/etiqueta exacta con el usuario (¿"VWall Libertador"?).

> Nota: la auditoría también detectó que `Docs/referencia-instalacion.md` usa nombres distintos para algunas MACs (p. ej. `a-Vip-BarraJoven1-TV03` vs `aVip-Bar-Boveda`). El Arranger real hoy coincide con `devices_all.txt`, no con esa referencia.
