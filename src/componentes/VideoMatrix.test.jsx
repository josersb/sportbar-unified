import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import ContextoUser from "../contexto/Contexto";
import VideoMatrix from "./VideoMatrix";

// ── Empty state ──

it("shows empty message when tvs is missing", () => {
  render(
    <ContextoUser.Provider value={{ estado: { tvs: undefined } }}>
      <VideoMatrix />
    </ContextoUser.Provider>
  );

  expect(screen.getByText("No hay TVs disponibles.")).toBeInTheDocument();
});

it("shows empty message when tvs is an empty object", () => {
  render(
    <ContextoUser.Provider value={{ estado: { tvs: {} } }}>
      <VideoMatrix />
    </ContextoUser.Provider>
  );

  expect(screen.getByText("No hay TVs disponibles.")).toBeInTheDocument();
});

// ── Default state ──

it("renders known TV IDs (VW Norte, VW Centro, VW Sur, TV1–TV14, TVRK)", () => {
  const tvs = {
    VWN: "DTV1",
    VWC: "DTV1",
    VWS: "DTV1",
    TV01: "DTV2",
    TV02: "DTV2",
    TVRACK: "DTV3",
  };

  render(
    <ContextoUser.Provider value={{ estado: { tvs } }}>
      <VideoMatrix />
    </ContextoUser.Provider>
  );

  expect(screen.getByText("VW Norte")).toBeInTheDocument();
  expect(screen.getByText("VW Centro")).toBeInTheDocument();
  expect(screen.getByText("VW Sur")).toBeInTheDocument();
  expect(screen.getByText("TV1")).toBeInTheDocument();
  expect(screen.getByText("TV2")).toBeInTheDocument();
  expect(screen.getByText("TVRK")).toBeInTheDocument();
});

it("does not render with fixed width (responsive)", () => {
  const tvs = {
    VWN: "DTV1",
    TV01: "DTV2",
  };

  const { container } = render(
    <ContextoUser.Provider value={{ estado: { tvs } }}>
      <VideoMatrix />
    </ContextoUser.Provider>
  );

  const section = container.querySelector("section");
  expect(section).toBeInTheDocument();

  const allElements = container.querySelectorAll("*");
  let hasFixedWidth = false;
  allElements.forEach((el) => {
    const style = el.getAttribute("style");
    if (style && /width:\s*\d+px/.test(style)) {
      hasFixedWidth = true;
    }
  });
  expect(hasFixedWidth).toBe(false);
});

describe("VideoMatrix — structure & a11y", () => {
  it("has section with aria-label", () => {
    const tvs = { TV01: "DTV1" };

    render(
      <ContextoUser.Provider value={{ estado: { tvs } }}>
        <VideoMatrix />
      </ContextoUser.Provider>
    );

    expect(
      screen.getByLabelText("Estado del video")
    ).toBeInTheDocument();
  });

  it("uses role='list' on group containers", () => {
    const tvs = {
      VWN: "DTV1",
      VWC: "DTV2",
      VWS: "DTV3",
      TV01: "DTV1",
      TV02: "DTV1",
      TV03: "DTV1",
      TV04: "DTV1",
      TV05: "DTV1",
      TV06: "DTV1",
      TV07: "DTV1",
      TV08: "DTV1",
      TV09: "DTV1",
      TV10: "DTV1",
      TV11: "DTV1",
      TV12: "DTV1",
      TV13: "DTV1",
      TV14: "DTV1",
      TVRACK: "DTV1",
    };

    const { container } = render(
      <ContextoUser.Provider value={{ estado: { tvs } }}>
        <VideoMatrix />
      </ContextoUser.Provider>
    );

    const lists = container.querySelectorAll('[role="list"]');
    expect(lists.length).toBeGreaterThanOrEqual(4);
  });

  it("uses role='listitem' on TV items", () => {
    const tvs = { TV01: "DTV1", TV02: "DTV1" };

    const { container } = render(
      <ContextoUser.Provider value={{ estado: { tvs } }}>
        <VideoMatrix />
      </ContextoUser.Provider>
    );

    const items = container.querySelectorAll('[role="listitem"]');
    expect(items.length).toBeGreaterThan(0);
  });
});
