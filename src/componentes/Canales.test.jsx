import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import { ToastProvider } from "./Toast";
import Canales from "./Canales";

// vi.mock is hoisted to top of file — use vi.hoisted for variables the factory needs
const { mockLoadChannelPreset, mockSendChannelDigits } = vi.hoisted(() => ({
  mockLoadChannelPreset: vi.fn().mockResolvedValue(undefined),
  mockSendChannelDigits: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api/arrangerApi", () => ({
  loadChannelPreset: mockLoadChannelPreset,
  sendChannelDigits: mockSendChannelDigits,
}));

// 8 decos with empty initial channels
const decosState = Array.from({ length: 8 }, () => ({ canalDeco: "" }));

// Known favorite channels (must match button values in the component)
const favoritos = ["1603", "1604", "1605"];

const baseState = {
  decos: decosState,
  favoritos,
  audio: [],
  tvs: {},
};

function renderWithContext(overrideValue = {}, { withToasts = false } = {}) {
  const contextValue = {
    estado: baseState,
    handleChangeEstadoDecos: vi.fn(),
    handleUpdateDispositivo: vi.fn(),
    ...overrideValue,
  };
  const ui = (
    <ProviderUser value={contextValue}>
      <Canales />
    </ProviderUser>
  );
  return withToasts ? render(<ToastProvider>{ui}</ToastProvider>) : render(ui);
}

describe("Canales submitCanal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    "DTV1",
    "DTV2",
    "DTV3",
    "DTV4",
    "DTV5",
    "DTV6",
  ])("calls sendChannelDigits for %s with channel 1603", async (dtv) => {
    const handleChangeEstadoDecos = vi.fn();
    renderWithContext({ handleChangeEstadoDecos });

    // Find the select element and set the deco value
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: dtv } });

    // Find the channel input and set the value
    const input = screen.getByPlaceholderText("numero a ingresar");
    fireEvent.change(input, { target: { value: "1603" } });

    // Submit the form
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    // Wait for the async call — canal comes as string from inputRef.current.value
    await vi.waitFor(() => {
      expect(mockSendChannelDigits).toHaveBeenCalledWith(dtv, "1603");
    });

    // loadChannelPreset should NOT be called (deprecated path not used)
    expect(mockLoadChannelPreset).not.toHaveBeenCalled();

    // State should always be updated (handleChangeEstadoDecos is outside try/catch)
    expect(handleChangeEstadoDecos).toHaveBeenCalled();
  });

  it("accepts 1624 even when estado.favoritos drifted (CF-1: allowlist is the source)", async () => {
    const handleChangeEstadoDecos = vi.fn();
    // favoritos con drift: NO incluye 1624 — la validación ya no lo lee.
    const estadoDrift = { ...baseState, favoritos: [1603, 1614, 1625] };
    renderWithContext({ estado: estadoDrift, handleChangeEstadoDecos });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "DTV1" } });
    const input = screen.getByPlaceholderText("numero a ingresar");
    fireEvent.change(input, { target: { value: "1624" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    await vi.waitFor(() => {
      expect(mockSendChannelDigits).toHaveBeenCalledWith("DTV1", "1624");
    });
    expect(handleChangeEstadoDecos).toHaveBeenCalled();
    expect(handleChangeEstadoDecos.mock.calls[0][0][0]).toEqual({ canalDeco: "1624" });
  });

  it("invalid channel shows a warning toast without resetting the input (CF-2)", async () => {
    const handleChangeEstadoDecos = vi.fn();
    renderWithContext({ handleChangeEstadoDecos }, { withToasts: true });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "DTV1" } });
    const input = screen.getByPlaceholderText("numero a ingresar");
    fireEvent.change(input, { target: { value: "9999" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    // Advertencia explícita (no silencio)
    expect(await screen.findByText("canal no válido")).toBeTruthy();

    // Sin reset silencioso: el input conserva el valor ingresado
    expect(input.value).toBe("9999");

    // No se envía nada al Arranger ni se muta el estado
    expect(mockSendChannelDigits).not.toHaveBeenCalled();
    expect(handleChangeEstadoDecos).not.toHaveBeenCalled();
    expect(mockLoadChannelPreset).not.toHaveBeenCalled();
  });

  it("rejects 1614 — obsolete favorite absent from the grid allowlist", async () => {
    // 1614 estaba en el default de estado.favoritos pero NO en CANALES_FAVORITOS
    const handleChangeEstadoDecos = vi.fn();
    renderWithContext({ handleChangeEstadoDecos }, { withToasts: true });

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "DTV1" } });
    const input = screen.getByPlaceholderText("numero a ingresar");
    fireEvent.change(input, { target: { value: "1614" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(await screen.findByText("canal no válido")).toBeTruthy();
    expect(mockSendChannelDigits).not.toHaveBeenCalled();
    expect(handleChangeEstadoDecos).not.toHaveBeenCalled();
  });
});
