import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProviderUser } from "../contexto/Contexto";
import Audio from "./Audio";

// vi.mock is hoisted to top of file — use vi.hoisted for variables the factory needs
const { mockSendSerialCommand } = vi.hoisted(() => ({
  mockSendSerialCommand: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../api/arrangerApi", () => ({
  sendSerialCommand: mockSendSerialCommand,
}));

// Audio component state — 3 zones with initial values
const audioState = [
  { nombreZona: "Norte", fuenteAudio: "DTV1", volumen: "-21", mute: false },
  { nombreZona: "Centro", fuenteAudio: "DTV1", volumen: "-23", mute: false },
  { nombreZona: "Sur", fuenteAudio: "DTV1", volumen: "-21", mute: false },
];

const baseState = {
  audio: audioState,
  tvs: {},
  decos: [],
  favoritos: [],
};

function renderWithContext(overrideValue = {}) {
  const contextValue = {
    estado: baseState,
    handleChangeEstadoAudio: vi.fn(),
    handleChangeEstadoDecos: vi.fn(),
    ...overrideValue,
  };
  return render(
    <ProviderUser value={contextValue}>
      <Audio />
    </ProviderUser>
  );
}

describe("Audio onSubmit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sendSerialCommand 9 times with correct parameters when Enviar is clicked", async () => {
    const handleChangeEstadoAudio = vi.fn();
    renderWithContext({ handleChangeEstadoAudio });

    // Click the submit button
    fireEvent.click(screen.getByText("Enviar"));

    // Wait for all 9 async calls to complete
    await vi.waitFor(() => {
      expect(mockSendSerialCommand).toHaveBeenCalledTimes(9);
    });

    // === Mute commands (3 calls) ===
    expect(mockSendSerialCommand).toHaveBeenCalledWith("DTV1", "Mute1 set mute 1 false");
    expect(mockSendSerialCommand).toHaveBeenCalledWith("DTV1", "Mute2 set mute 1 false");
    expect(mockSendSerialCommand).toHaveBeenCalledWith("DTV1", "Mute3 set mute 1 false");

    // === Volume commands (3 calls) ===
    expect(mockSendSerialCommand).toHaveBeenCalledWith("DTV1", "Level3 set level 1 -21");
    expect(mockSendSerialCommand).toHaveBeenCalledWith("DTV1", "Level4 set level 1 -23");
    expect(mockSendSerialCommand).toHaveBeenCalledWith("DTV1", "Level5 set level 1 -21");

    // === Source selector commands (3 calls) ===
    expect(mockSendSerialCommand).toHaveBeenCalledWith(
      "DTV1",
      "SourceSelector1 set sourceSelection DTV1"
    );
    expect(mockSendSerialCommand).toHaveBeenCalledWith(
      "DTV1",
      "SourceSelector2 set sourceSelection DTV1"
    );
    expect(mockSendSerialCommand).toHaveBeenCalledWith(
      "DTV1",
      "SourceSelector3 set sourceSelection DTV1"
    );

    // State should be updated after the calls
    expect(handleChangeEstadoAudio).toHaveBeenCalled();
  });
});
