import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { ProviderUser } from "../contexto/Contexto";
import Body from "./Body";
import styles from "./Body.module.css";

// Minimal state so Aside doesn't crash on context access
const baseState = {
  tvs: {},
  audio: [],
  decos: [],
  favoritos: [],
  dispositivos: {},
};
const contextValue = {
  estado: baseState,
};

function renderBody() {
  return render(
    <ProviderUser value={contextValue}>
      <Body />
    </ProviderUser>
  );
}

describe("Body — component structure", () => {
  // Body includes its own <BrowserRouter> — don't add another Router wrapper

  it("renders the grid container with CSS Module class", () => {
    renderBody();

    // The CSS Module class is applied as the container className
    const container = document.querySelector(`.${styles.container}`);
    expect(container).toBeInTheDocument();
  });

  it("renders navigation element inside the grid", () => {
    renderBody();

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders an aside element for device info", () => {
    renderBody();

    // The Aside renders "Estado de canales" heading text
    expect(screen.getByText("Estado de canales")).toBeInTheDocument();
  });
});

describe("Body.module.css — responsive breakpoints", () => {
  const css = readFileSync("src/componentes/Body.module.css", "utf-8");

  it("defines @media (max-width: 768px) for aside collapse into stacked layout", () => {
    expect(css).toContain("@media (max-width: 768px)");
  });

  it("switches to single-column grid-template-columns at 768px", () => {
    // Extract the 768px media query block
    const block768 = css
      .split("max-width: 768px")[1]
      .split("@media")[0];

    expect(block768).toContain("grid-template-columns: 1fr");
    expect(block768).toContain('"aside"');
    expect(block768).toContain('"main"');
  });

  it("defines @media (max-width: 1024px) for fluid layout", () => {
    expect(css).toContain("@media (max-width: 1024px)");

    const block1024 = css
      .split("max-width: 1024px")[1]
      .split("@media")[0];

    expect(block1024).toContain("grid-template-columns: 30% 1fr");
  });

  it("defines @media (max-width: 600px) for tighter spacing", () => {
    expect(css).toContain("@media (max-width: 600px)");

    const block600 = css
      .split("max-width: 600px")[1]
      .split("@media")[0];

    expect(block600).toContain("gap: 0");
    expect(block600).toContain("padding: 5px");
  });

  it("uses grid layout in the default (unmodified) viewport", () => {
    // The default grid should have aside + main side by side
    expect(css).toContain('grid-template-columns: 25% auto');
    expect(css).toContain('"aside main"');
  });
});
