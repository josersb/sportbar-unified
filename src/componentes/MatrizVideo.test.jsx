import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import MatrizVideo from "./MatrizVideo";

// vi.mock is hoisted to top of file — use vi.hoisted for variables the factory needs
const { mockSetTvSource, mockSetTvrackVideo, mockSetTvrackAudio, mockSetTvrackLink } = vi.hoisted(() => ({
  mockSetTvSource: vi.fn().mockResolvedValue({ ok: true, reported: "DTV1" }),
  mockSetTvrackVideo: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  mockSetTvrackAudio: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
  mockSetTvrackLink: vi.fn().mockResolvedValue({ video: "DTV1", audio: "DTV1", link: false }),
}));

vi.mock("../api/arrangerApi", () => ({
  setTvSource: mockSetTvSource,
  setTvrackVideo: mockSetTvrackVideo,
  setTvrackAudio: mockSetTvrackAudio,
  setTvrackLink: mockSetTvrackLink,
}));

// TV values — cada zona usa un patrón distinto para verificar el mapeo.
// PR 3: sin keys legacy (TvsBarra*, TvsEscalera*, TVRACK) — solo TVs reales.
const initialTvs = {
  VWN: "DTV1",
  VWC: "DTV2",
  VWS: "DTV3",
  TV01: "DTV1",
  TV02: "DTV2",
  TV03: "DTV3",
  TV04: "DTV1",
  TV05: "DTV2",
  TV06: "DTV3",
  TV07: "DTV4",
  TV08: "DTV1",
  TV09: "DTV2",
  TV10: "DTV3",
  TV11: "DTV1",
  TV12: "DTV2",
  TV13: "DTV3",
  TV14: "DTV4",
  TV15: "DTV1",
  TV16: "DTV2",
  TV17: "DTV3",
  TV18: "DTV4",
  TV19: "DTV1",
  TV20: "DTV2",
  TV21: "DTV3",
  TV22: "DTV4",
  TV23: "DTV1",
  TV24: "DTV2",
  TV25: "DTV3",
  TV26: "DTV4",
};

const baseState = {
  tvs: initialTvs,
  decos: [],
  favoritos: [],
  audio: [],
};

// WS4d: fixture del matrixModel (misma estructura que sirve el broker).
// Es un fixture de test — el código de producción NO duplica el modelo (MG-4).
const testMatrixModel = {
  zones: [
    {
      key: "videowall",
      subgroups: [
        { key: "VWN", dir: "Norte", screens: ["VWN"] },
        { key: "VWC", dir: "Centro", screens: ["VWC"] },
        { key: "VWS", dir: "Sur", screens: ["VWS"] },
      ],
    },
    {
      key: "perimetro",
      subgroups: [
        { key: "TvsEscaleraNorte", dir: "Norte", screens: ["TV23", "TV24", "TV25", "TV26"] },
        { key: "TvsEscaleraCentro", dir: "Centro", screens: ["TV19", "TV20", "TV21", "TV22"] },
        { key: "TvsEscaleraSur", dir: "Sur", screens: ["TV15", "TV16", "TV17", "TV18"] },
      ],
    },
    {
      key: "barra",
      subgroups: [
        { key: "TvsBarraNorte", dir: "Norte", screens: ["TV11", "TV12", "TV13", "TV14"] },
        { key: "TvsBarraLibertador", dir: "Libertador", screens: ["TV01", "TV02", "TV03"] },
        { key: "TvsBarraSur", dir: "Sur", screens: ["TV04", "TV05", "TV06", "TV07"] },
        { key: "TvsBarraPista", dir: "Pista", screens: ["TV08", "TV09", "TV10"] },
      ],
    },
  ],
  combosBySize: {
    3: ["DTV123", "DTV121", "DTV542", "DTV143", "DTV153"],
    4: ["DTV1234", "DTV1212", "DTV1231", "DTV5432", "DTV3254", "DTV1354"],
  },
};

const mockHandleZonasFueraChange = vi.fn();
const mockGetOptimisticDomain = vi.fn(() => ({}));
const mockRevertOptimistic = vi.fn();

function renderWithContext(overrideValue = {}) {
  const contextValue = {
    estado: baseState,
    handleChangeEstadoVideo: vi.fn(),
    handleChangeEstadoPreset: vi.fn(),
    tvrackState: { video: "DTV1", audio: "DTV1", link: false },
    handleChangeTvrack: vi.fn(),
    zonasFueraState: {},
    handleZonasFueraChange: mockHandleZonasFueraChange,
    syncStatus: { status: "synced", lastSync: null },
    syncDiffs: [],
    // fix real-hardware A: los handlers aplican optimistic al snapshot del
    // broker; en los tests es un no-op (no usamos el hook real). Hotfix 5:
    // el rollback del optimistic en write fallido también es no-op aquí.
    applyOptimistic: vi.fn(),
    getOptimisticDomain: mockGetOptimisticDomain,
    revertOptimistic: mockRevertOptimistic,
    // WS4d: por defecto el modelo sirvió y el server no reportó matrixGroups
    // (los valores caen al collapse de las TVs individuales). Los tests de
    // degradación sobreescriben matrixModel: null.
    matrixModel: testMatrixModel,
    matrixGroups: {},
    ...overrideValue,
  };
  return render(
    <ProviderUser value={contextValue}>
      <MatrizVideo />
    </ProviderUser>
  );
}

describe("MatrizVideo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHandleZonasFueraChange.mockClear();
  });

  describe("handleTvrackBtn — TVRACK Video/Audio buttons", () => {
    it.each([
      "DTV1", "DTV2", "DTV3", "DTV4",
      "DTV5", "DTV6", "DTV7", "DTV8",
    ])(
      "calls setTvrackVideo(%s) when video %s button is clicked (write-through broker)",
      async (dtv) => {
        renderWithContext();

        fireEvent.click(screen.getByTestId(`btn-video-${dtv}`));

        await vi.waitFor(() => {
          expect(mockSetTvrackVideo).toHaveBeenCalledWith(dtv);
        });
      }
    );

    it.each([
      "DTV1", "DTV2", "DTV3", "DTV4",
      "DTV5", "DTV6", "DTV7", "DTV8",
    ])(
      "calls setTvrackAudio(%s) when audio %s button is clicked (write-through broker)",
      async (dtv) => {
        renderWithContext();

        fireEvent.click(screen.getByTestId(`btn-audio-${dtv}`));

        await vi.waitFor(() => {
          expect(mockSetTvrackAudio).toHaveBeenCalledWith(dtv);
        });
      }
    );

    it("does NOT crash when setTvrackVideo fails", async () => {
      mockSetTvrackVideo.mockRejectedValueOnce(new Error("Network error"));
      renderWithContext();

      fireEvent.click(screen.getByTestId("btn-video-DTV1"));

      await vi.waitFor(() => {
        expect(mockSetTvrackVideo).toHaveBeenCalled();
      });

      // No error should propagate — the button just shows error toast
      expect(mockSetTvrackVideo).toHaveBeenCalled();
    });
  });

  describe("ZonasFueraSection — mini-card zone controls", () => {
    it("renders 10 zona cards with zone labels from ZONE_LABELS", () => {
      const zonasFueraState = {
        "aVip-Barra-Centro": { video: "DTV3", audio: "DTV3", link: true },
        "aVip-Lobby-Batacazo": { video: "DTV5", audio: "DTV5", link: false },
        "aVip-Bar-Boveda": { video: "DTV1", audio: "DTV1", link: true },
        "RACK-VIP-PANTALLABATACA": { video: "DTV2", audio: "DTV2", link: false },
        "aMas-15-Barra": { video: "DTV4", audio: "DTV1", link: true },
        "a-Menos1-Escenario": { video: "DTV6", audio: "DTV6", link: false },
        "a-Menos1-Escenario2": { video: "DTV7", audio: "DTV7", link: true },
        "a-QMR75-Menos1-TV1": { video: "DTV8", audio: "DTV1", link: false },
        "a-QMR75-Menos1-TV2": { video: "DTV1", audio: "DTV1", link: true },
        "a-QMC65-Menos1-TV2": { video: "DTV3", audio: "DTV3", link: false },
      };

      renderWithContext({ zonasFueraState });

      expect(screen.getByText("VIP Barra Centro")).toBeInTheDocument();
      expect(screen.getByText("VIP Lobby Batacazo")).toBeInTheDocument();
      expect(screen.getByText("VIP Bar Bóveda")).toBeInTheDocument();
      expect(screen.getByText("Rack VIP Bataca")).toBeInTheDocument();
      expect(screen.getByText("+15 Barra")).toBeInTheDocument();
      expect(screen.getByText("Escenario -1")).toBeInTheDocument();
      expect(screen.getByText("Escenario -1 (2)")).toBeInTheDocument();
      expect(screen.getByText("QMR75 -1 TV1")).toBeInTheDocument();
      expect(screen.getByText("QMR75 -1 TV2")).toBeInTheDocument();
      expect(screen.getByText("QMC65 -1 TV2")).toBeInTheDocument();
    });

    it("renders active badge showing current video source", () => {
      const zonasFueraState = {
        "aVip-Barra-Centro": { video: "DTV3", audio: "DTV3", link: true },
      };

      renderWithContext({ zonasFueraState });

      const badges = screen.getAllByText("DTV3");
      expect(badges.length).toBeGreaterThanOrEqual(1);
    });

    it("shows em dash when no video source is set", () => {
      renderWithContext({ zonasFueraState: {} });

      const dashes = screen.getAllByText("\u2014");
      expect(dashes.length).toBe(10);
    });

    it("calls handleZonasFueraChange with zoneId, 'video', deviceId when button clicked", () => {
      const zonasFueraState = {
        "aVip-Barra-Centro": { video: "DTV1", audio: "DTV1", link: false },
      };

      const handleZonasFueraChange = vi.fn();
      renderWithContext({ zonasFueraState, handleZonasFueraChange });

      fireEvent.click(screen.getByTestId("btn-zf-video-aVip-Barra-Centro-DTV3"));

      expect(handleZonasFueraChange).toHaveBeenCalledWith(
        "aVip-Barra-Centro",
        "video",
        "DTV3"
      );
    });

    it("renders link toggle checkbox for each zone", () => {
      renderWithContext();

      const linkLabels = screen.getAllByText("Vincular video + audio");
      expect(linkLabels.length).toBe(10);
    });

    it("calls handleZonasFueraChange with link type when toggle clicked", () => {
      const zonasFueraState = {
        "aVip-Barra-Centro": { video: "DTV1", audio: "DTV1", link: false },
      };

      const handleZonasFueraChange = vi.fn();
      renderWithContext({ zonasFueraState, handleZonasFueraChange });

      const checkboxes = screen.getAllByRole("checkbox");
      // First checkbox is TVRACK link, skip it — zona checkboxes start after
      const zonaLinkCheckbox = checkboxes[1];
      fireEvent.click(zonaLinkCheckbox);

      expect(handleZonasFueraChange).toHaveBeenCalledWith(
        "aVip-Barra-Centro",
        "link",
        true
      );
    });
  });

  describe("onSubmit (Enviar button)", () => {
    it("calls setTvSource for all 29 real destinations via broker (no client joins)", async () => {
      renderWithContext();

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockSetTvSource).toHaveBeenCalled();
      });

      // 29 destinos reales: VWN/VWC/VWS + TV01-TV26 (sin TVRACK ni TvsBarra*)
      expect(mockSetTvSource).toHaveBeenCalledTimes(29);

      // First call should be VWN
      expect(mockSetTvSource.mock.calls[0]).toEqual(["VWN", "DTV1"]);
    });

    it("submits the batch ordered by physical groups (hotfix 6: video-wall first)", async () => {
      renderWithContext();

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockSetTvSource).toHaveBeenCalledTimes(29);
      });

      // Orden de envío = orden de ejecución con el semáforo global del
      // server: video wall → escaleras norte/centro/sur → barras.
      const calledDests = mockSetTvSource.mock.calls.map(([dest]) => dest);
      expect(calledDests.slice(0, 29)).toEqual([
        "VWN", "VWC", "VWS",
        "TV23", "TV24", "TV25", "TV26",
        "TV19", "TV20", "TV21", "TV22",
        "TV15", "TV16", "TV17", "TV18",
        "TV01", "TV02", "TV03",
        "TV04", "TV05", "TV06", "TV07",
        "TV08", "TV09", "TV10",
        "TV11", "TV12", "TV13", "TV14",
      ]);
    });

    it("does NOT call handleChangeEstadoVideo (estado llega por SSE)", async () => {
      const handleChangeEstadoVideo = vi.fn();
      renderWithContext({ handleChangeEstadoVideo });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockSetTvSource).toHaveBeenCalled();
      });

      expect(handleChangeEstadoVideo).not.toHaveBeenCalled();
    });

    it("continues submitting even when some writes fail (Promise.allSettled)", async () => {
      // Make some calls fail but others succeed
      mockSetTvSource
        .mockRejectedValueOnce(new Error("Network error"))
        .mockRejectedValueOnce(new Error("Network error"));

      renderWithContext();

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockSetTvSource).toHaveBeenCalled();
      });

      // All 29 still attempted despite failures (allSettled never rejects)
      expect(mockSetTvSource.mock.calls.length).toBeGreaterThanOrEqual(29);

      // Clean up mock
      mockSetTvSource.mockResolvedValue({ ok: true, reported: "DTV1" });
    });

    it("reverts optimistic of failed writes and reports count on 429 (hotfix 5)", async () => {
      // Un 429 por express-rate-limit: la API expone err.status (arrangerApi
      // writeError). 3 de las 29 órdenes rechazadas → revert + toast con conteo.
      const e429 = new Error("Too many requests, try again later");
      e429.status = 429;
      mockSetTvSource
        .mockRejectedValueOnce(e429)
        .mockRejectedValueOnce(e429)
        .mockRejectedValueOnce(e429)
        .mockResolvedValue({ ok: true, reported: "DTV1" });

      const applyOptimistic = vi.fn();
      const revertOptimistic = vi.fn();
      renderWithContext({ applyOptimistic, revertOptimistic });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockSetTvSource).toHaveBeenCalledTimes(29);
      });

      // El optimistic del batch se aplicó (patch de TVs) y el rollback de los
      // fallidos se disparó con el overlay previo.
      expect(applyOptimistic).toHaveBeenCalledWith("tvs", expect.objectContaining({ TV01: expect.any(String) }));
      expect(revertOptimistic).toHaveBeenCalledWith("tvs", expect.any(Object), expect.any(Object));

      // Clean up mock
      mockSetTvSource.mockResolvedValue({ ok: true, reported: "DTV1" });
    });
  });

  describe("WS4d — render desde matrixModel servido (MG-4/MG-5/MG-6/MG-7)", () => {
    it("renderiza las 3 zonas y los 10 subgrupos desde el modelo, con label dir del subgrupo", () => {
      renderWithContext();

      // Títulos de zona (display; las opciones/subgrupos vienen del modelo).
      expect(screen.getByText("Videos Wall Norte - Centro - Sur")).toBeInTheDocument();
      expect(screen.getByText("Perímetro de TVs Norte - Centro - Sur")).toBeInTheDocument();
      // MG-7: "Libertador", nunca "Livertador".
      expect(screen.getByText("Tvs de la Barra Norte - Libertador - Sur - Pista")).toBeInTheDocument();
      expect(screen.queryByText(/Livertador/)).toBeNull();

      // 10 selects: label = dir del subgrupo. Únicos: Libertador y Pista.
      expect(screen.getByLabelText("Libertador")).toBeInTheDocument();
      expect(screen.getByLabelText("Pista")).toBeInTheDocument();
      // Duplicados por dir: Norte ×3, Centro ×2, Sur ×3.
      expect(screen.getAllByLabelText("Norte").length).toBe(3);
      expect(screen.getAllByLabelText("Centro").length).toBe(2);
      expect(screen.getAllByLabelText("Sur").length).toBe(3);
    });

    it("ofrece las opciones correctas por tamaño (MG-5): 8 fuentes + combos del modelo", () => {
      renderWithContext();

      // VWN (1 pantalla): solo DTV1..DTV8, sin combos.
      const vwallNorte = screen.getAllByLabelText("Norte")[0];
      const optVWN = within(vwallNorte).getAllByRole("option").map((o) => o.value);
      expect(optVWN).toEqual(["DTV1", "DTV2", "DTV3", "DTV4", "DTV5", "DTV6", "DTV7", "DTV8"]);

      // TvsBarraLibertador (3 pantallas): 8 fuentes + 5 combos de tamaño 3.
      const libertador = screen.getByLabelText("Libertador");
      const optLibertador = within(libertador).getAllByRole("option").map((o) => o.value);
      expect(optLibertador).toHaveLength(13);
      expect(optLibertador).toContain("DTV542");
      expect(optLibertador).not.toContain("DTV1234"); // combo de 4 rechazado en subgrupo de 3

      // TvsBarraNorte (4 pantallas): 8 fuentes + 6 combos de tamaño 4.
      const barraNorte = screen.getAllByLabelText("Norte")[2];
      const optBarraNorte = within(barraNorte).getAllByRole("option").map((o) => o.value);
      expect(optBarraNorte).toHaveLength(14);
      expect(optBarraNorte).toContain("DTV1234");
      expect(optBarraNorte).not.toContain("DTV123"); // combo de 3 rechazado en subgrupo de 4
    });

    it("muestra 'Mixto / Personalizado' cuando el server reporta null (MG-6, precedencia server)", () => {
      renderWithContext({ matrixGroups: { TvsBarraSur: null } });

      // TvsBarraSur es el 3er select con label "Sur" (VWS, EscaleraSur, BarraSur).
      const barraSur = screen.getAllByLabelText("Sur")[2];
      expect(barraSur.value).toBe("__mixto__");
      // La opción Mixto existe (renderizada porque el valor derivado es null).
      const mixtoOption = within(barraSur).getAllByRole("option").find((o) => o.value === "__mixto__");
      expect(mixtoOption).toHaveTextContent("Mixto / Personalizado");
      // El server manda: aunque initialTvs de TvsBarraSur colapsa a DTV1234.
      expect(screen.getByText("Mixto / Personalizado")).toBeInTheDocument();
    });

    it("usa matrixGroups.desired con precedencia server sobre el collapse de tvs", () => {
      renderWithContext({ matrixGroups: { TvsBarraLibertador: "DTV542" } });

      // initialTvs TV01..03 = DTV1/2/3 (colapsarían a DTV123), pero el server
      // reportó DTV542 → el select muestra DTV542.
      expect(screen.getByLabelText("Libertador").value).toBe("DTV542");
    });

    it("muestra 'Sin datos' (sin selección) cuando no hay valor derivado (undefined)", () => {
      renderWithContext({ estado: { ...baseState, tvs: {} } });

      // Sin tvs individuales: collapse → undefined → sin selección.
      const libertador = screen.getByLabelText("Libertador");
      expect(libertador.value).toBe("");
      const noData = within(libertador).getAllByRole("option").find((o) => o.value === "");
      expect(noData).toHaveTextContent("Sin datos");
    });

    it("el submit legacy expande con la key renombrada TvsBarraLibertador (sin Livertador)", async () => {
      renderWithContext();

      fireEvent.change(screen.getByLabelText("Libertador"), {
        target: { value: "DTV542" },
      });
      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockSetTvSource).toHaveBeenCalledTimes(29);
      });

      // Expansión del combo DTV542 por posición (TV01..TV03).
      expect(mockSetTvSource).toHaveBeenCalledWith("TV01", "DTV5");
      expect(mockSetTvSource).toHaveBeenCalledWith("TV02", "DTV4");
      expect(mockSetTvSource).toHaveBeenCalledWith("TV03", "DTV2");
      // La key legacy del typo NO existe en el DOM (W-2 cerrado).
      expect(screen.queryByText(/Livertador/)).toBeNull();
    });

    it("el submit conserva la fuente real de las TVs de un grupo en estado Mixto (sin coacción W-1)", async () => {
      renderWithContext({ matrixGroups: { TvsBarraSur: null } });

      fireEvent.click(screen.getByText("Enviar"));

      await vi.waitFor(() => {
        expect(mockSetTvSource).toHaveBeenCalledTimes(29);
      });

      // El submit legacy sigue escribiendo las 29 TVs (DoD WS4d), pero el
      // grupo mixto NO se coacciona: TV04..TV07 conservan su fuente real
      // (re-escritura no-op), a diferencia del bug W-1 que las forzaba a DTV1.
      expect(mockSetTvSource).toHaveBeenCalledWith("TV04", "DTV1");
      expect(mockSetTvSource).toHaveBeenCalledWith("TV05", "DTV2");
      expect(mockSetTvSource).toHaveBeenCalledWith("TV06", "DTV3");
      expect(mockSetTvSource).toHaveBeenCalledWith("TV07", "DTV4");
      // El resto del submit sigue por-TV (VWN escribe).
      expect(mockSetTvSource).toHaveBeenCalledWith("VWN", "DTV1");
    });

    it("sin matrixModel: degradación segura (sin selects de grupos, Enviar deshabilitado, TVRACK intacto)", () => {
      renderWithContext({ matrixModel: null });

      expect(screen.getByText(/Modelo de matriz no disponible/)).toBeInTheDocument();
      expect(screen.queryByLabelText("Libertador")).toBeNull();
      expect(screen.queryByLabelText("Pista")).toBeNull();

      const enviar = screen.getByText("Enviar");
      expect(enviar).toBeDisabled();

      // El resto del componente sigue renderizando.
      expect(screen.getByTestId("btn-video-DTV1")).toBeInTheDocument();
      expect(screen.getByText("ZONAS FUERA DE SPORTBAR")).toBeInTheDocument();
    });
  });
});
