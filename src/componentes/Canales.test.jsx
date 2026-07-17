import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
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

function renderWithContext(overrideValue = {}) {
  const contextValue = {
    estado: baseState,
    handleChangeEstadoDecos: vi.fn(),
    handleUpdateDispositivo: vi.fn(),
    ...overrideValue,
  };
  return render(
    <ProviderUser value={contextValue}>
      <Canales />
    </ProviderUser>
  );
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
});
