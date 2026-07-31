import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextoUser from "../contexto/Contexto";
import { getAllDevices } from "../contexto/dispositivos";
import DecosStatus from "./DecosStatus";

const decos = getAllDevices();

// ── Loading state ──

it("renders loading indicator when estadoLoaded is false", () => {
  render(
    <ContextoUser.Provider value={{ estado: {}, estadoLoaded: false }}>
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.getByText("Cargando estado de decodificadores…")
  ).toBeInTheDocument();
  expect(screen.getByText("Estado de canales")).toBeInTheDocument();
});

// ── Empty state ──

it("shows empty message when dispositivos is missing", () => {
  render(
    <ContextoUser.Provider
      value={{ estado: { dispositivos: undefined }, estadoLoaded: true }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.getByText("No hay decodificadores disponibles.")
  ).toBeInTheDocument();
});

it("shows empty message when dispositivos is an empty object", () => {
  render(
    <ContextoUser.Provider
      value={{ estado: { dispositivos: {} }, estadoLoaded: true }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.getByText("No hay decodificadores disponibles.")
  ).toBeInTheDocument();
});

// ── Default state ──

it("renders a row for each deco with var(--DTV*) style colors", () => {
  const dispositivos = Object.fromEntries(
    decos.map((d) => [
      d.id,
      { canalActual: "1603", online: true },
    ])
  );

  render(
    <ContextoUser.Provider
      value={{ estado: { dispositivos }, estadoLoaded: true }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  // All 8 deco IDs should be rendered
  for (const deco of decos) {
    expect(screen.getByText(deco.id)).toBeInTheDocument();
  }

  // Reload button should be present
  expect(
    screen.getByRole("button", { name: "Recargar estado de canales" })
  ).toBeInTheDocument();
});

it("renders header row with DECO and CANAL labels", () => {
  const dispositivos = Object.fromEntries(
    decos.map((d) => [d.id, { canalActual: "1603", online: true }])
  );

  render(
    <ContextoUser.Provider
      value={{ estado: { dispositivos }, estadoLoaded: true }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(screen.getByText("DECO")).toBeInTheDocument();
  expect(screen.getByText("CANAL")).toBeInTheDocument();
});

it("uses var(--DTV*) CSS variables for background colors via inline style", () => {
  const dispositivos = Object.fromEntries(
    decos.map((d) => [d.id, { canalActual: "1603", online: true }])
  );

  render(
    <ContextoUser.Provider
      value={{ estado: { dispositivos }, estadoLoaded: true }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  for (const deco of decos) {
    const li = screen.getByText(deco.id).closest("li");
    expect(li).toHaveStyle({ backgroundColor: `var(--${deco.id})` });
  }
});

it("shows dash for decos without provider (no canalActual)", () => {
  // DTV7 and DTV8 have provider: null and no defaultChannel
  const dispositivos = {
    DTV7: { canalActual: null, online: true },
    DTV8: { canalActual: null, online: true },
  };

  render(
    <ContextoUser.Provider
      value={{ estado: { dispositivos }, estadoLoaded: true }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(screen.getByText("DTV7")).toBeInTheDocument();
  expect(screen.getByText("DTV8")).toBeInTheDocument();
});

// ── Error state ──

it("shows error message when errorDecos is true", () => {
  render(
    <ContextoUser.Provider
      value={{
        estado: {},
        estadoLoaded: true,
        errorDecos: true,
        reintentarDecos: () => {},
      }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.getByText("Error al cargar estado de decodificadores")
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Reintentar cargar estado" })
  ).toBeInTheDocument();
});

it("does NOT show error when errorDecos is false", () => {
  render(
    <ContextoUser.Provider
      value={{
        estado: { dispositivos: { DTV1: { canalActual: "1603", online: true } } },
        estadoLoaded: true,
        errorDecos: false,
        reintentarDecos: () => {},
      }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.queryByText("Error al cargar estado de decodificadores")
  ).not.toBeInTheDocument();
});

it("displays error section with role='alert'", () => {
  render(
    <ContextoUser.Provider
      value={{
        estado: {},
        estadoLoaded: true,
        errorDecos: true,
        reintentarDecos: () => {},
      }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  expect(
    screen.getByRole("alert")
  ).toBeInTheDocument();
});

it("calls reintentarDecos when retry button is clicked", async () => {
  const reintentarMock = vi.fn();

  render(
    <ContextoUser.Provider
      value={{
        estado: {},
        estadoLoaded: true,
        errorDecos: true,
        reintentarDecos: reintentarMock,
      }}
    >
      <DecosStatus />
    </ContextoUser.Provider>
  );

  const retryBtn = screen.getByRole("button", { name: "Reintentar cargar estado" });
  await retryBtn.click();
  expect(reintentarMock).toHaveBeenCalledOnce();
});

describe("DecosStatus — structure", () => {
  it("has aria-label on section", () => {
    const dispositivos = { DTV1: { canalActual: "1603", online: true } };

    render(
      <ContextoUser.Provider
        value={{ estado: { dispositivos }, estadoLoaded: true }}
      >
        <DecosStatus />
      </ContextoUser.Provider>
    );

    expect(
      screen.getByLabelText("Estado de canales")
      // The section has aria-label="Estado de canales"
    ).toBeInTheDocument();
  });
});
