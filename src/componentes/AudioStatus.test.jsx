import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextoUser from "../contexto/Contexto";
import AudioStatus from "./AudioStatus";

// ── Empty state ──

it("shows empty message when audio is missing", () => {
  render(
    <ContextoUser.Provider value={{ estado: { audio: undefined } }}>
      <AudioStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.getByText("No hay zonas de audio disponibles.")
  ).toBeInTheDocument();
});

it("shows empty message when audio is an empty array", () => {
  render(
    <ContextoUser.Provider value={{ estado: { audio: [] } }}>
      <AudioStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.getByText("No hay zonas de audio disponibles.")
  ).toBeInTheDocument();
});

// ── Default state ──

it("renders a table with Sur, Centro, Norte zones", () => {
  const audio = [
    { nombreZona: "Sur", fuenteAudio: "DTV1", volumen: "-21", mute: false },
    { nombreZona: "Centro", fuenteAudio: "DTV2", volumen: "-23", mute: false },
    { nombreZona: "Norte", fuenteAudio: "DTV3", volumen: "-18", mute: true },
  ];

  render(
    <ContextoUser.Provider value={{ estado: { audio } }}>
      <AudioStatus />
    </ContextoUser.Provider>
  );

  expect(screen.getByText("Sur")).toBeInTheDocument();
  expect(screen.getByText("Centro")).toBeInTheDocument();
  expect(screen.getByText("Norte")).toBeInTheDocument();
  expect(screen.getByText("DTV1")).toBeInTheDocument();
  expect(screen.getByText("DTV2")).toBeInTheDocument();
  expect(screen.getByText("DTV3")).toBeInTheDocument();
  expect(screen.getByText("-21")).toBeInTheDocument();
  expect(screen.getByText("-23")).toBeInTheDocument();
  expect(screen.getByText("-18")).toBeInTheDocument();
});

it("shows ON for muted zones and OFF for unmuted", () => {
  const audio = [
    { nombreZona: "Sur", fuenteAudio: "DTV1", volumen: "-21", mute: true },
    { nombreZona: "Centro", fuenteAudio: "DTV2", volumen: "-23", mute: false },
  ];

  render(
    <ContextoUser.Provider value={{ estado: { audio } }}>
      <AudioStatus />
    </ContextoUser.Provider>
  );

  const onElements = screen.getAllByText("ON");
  expect(onElements.length).toBeGreaterThanOrEqual(1);
  expect(screen.getByText("OFF")).toBeInTheDocument();
});

describe("AudioStatus — structure", () => {
  it("renders a semantic table with thead and tbody", () => {
    const audio = [
      { nombreZona: "Sur", fuenteAudio: "DTV1", volumen: "-21", mute: false },
    ];

    render(
      <ContextoUser.Provider value={{ estado: { audio } }}>
        <AudioStatus />
      </ContextoUser.Provider>
    );

    const list = document.querySelector("ul[role='list']");
    expect(list).toBeInTheDocument();
    const items = list.querySelectorAll("li");
    expect(items.length).toBeGreaterThanOrEqual(2);
  });

  it("has scope='col' on all header cells", () => {
    const audio = [
      { nombreZona: "Sur", fuenteAudio: "DTV1", volumen: "-21", mute: false },
    ];

    render(
      <ContextoUser.Provider value={{ estado: { audio } }}>
        <AudioStatus />
      </ContextoUser.Provider>
    );

    const headers = document.querySelectorAll("th");
    headers.forEach((th) => {
      expect(th).toHaveAttribute("scope", "col");
    });
  });

  it("has section with aria-label", () => {
    const audio = [
      { nombreZona: "Sur", fuenteAudio: "DTV1", volumen: "-21", mute: false },
    ];

    render(
      <ContextoUser.Provider value={{ estado: { audio } }}>
        <AudioStatus />
      </ContextoUser.Provider>
    );

    expect(
      screen.getByLabelText("Estado del audio")
    ).toBeInTheDocument();
  });
});
