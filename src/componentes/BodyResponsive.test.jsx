import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { readFileSync } from "node:fs";
import { ProviderUser } from "../contexto/Contexto";
import Body from "./Body";
import styles from "./Body.module.css";
import skipStyles from "./SkipToContent.module.css";

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
    <BrowserRouter>
      <ProviderUser value={contextValue}>
        <Body />
      </ProviderUser>
    </BrowserRouter>
  );
}

describe("Body — component structure", () => {
  it("renders the grid container with CSS Module class", () => {
    renderBody();

    const container = document.querySelector(`.${styles.container}`);
    expect(container).toBeInTheDocument();
  });

  it("renders navigation element inside the grid", () => {
    renderBody();

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("renders an aside element for device info", () => {
    renderBody();

    expect(screen.getByText("Estado de canales")).toBeInTheDocument();
  });

  it("renders skip-to-content link as first focusable element", () => {
    const { container } = renderBody();

    const skipLink = screen.getByText("Saltar al contenido principal");
    expect(skipLink).toBeInTheDocument();
    expect(skipLink).toHaveAttribute("href", "#main-content");

    // Verify it is the first element rendered inside the React root container
    expect(container.firstElementChild).toBe(skipLink);
  });

  it("skip-to-content uses CSS Module sr-only pattern (visible only on :focus-visible)", () => {
    renderBody();

    const skipLink = screen.getByText("Saltar al contenido principal");

    // Check it has the CSS Module class
    expect(skipLink.className).toContain(skipStyles.skipLink.replace(/^.*-/, ""));

    // The CSS rules make it sr-only by default:
    //   transform: translateX(-100%); opacity: 0; pointer-events: none;
    // And visible on :focus-visible via:
    //   .skipLink:focus-visible { transform: translateX(0); opacity: 1; pointer-events: auto; }
    expect(skipLink).toHaveClass(skipStyles.skipLink);
  });

  it("renders a <main> element with id='main-content' for skip link target", () => {
    renderBody();

    const main = document.querySelector("main#main-content");
    expect(main).toBeInTheDocument();
  });
});

describe("Body.module.css — mobile-first responsive breakpoints", () => {
  const css = readFileSync("src/componentes/Body.module.css", "utf-8");

  it("uses class selectors (.header, .nav, .aside, .main) for grid areas", () => {
    // Class selectors must exist
    expect(css).toContain(".header");
    expect(css).toContain(".nav");
    expect(css).toContain(".aside");
    expect(css).toContain(".main");

    // Element selectors must NOT be used directly for grid-area
    // (checking that there's no bare `header { grid-area:` pattern)
    expect(css).not.toMatch(/^header\s*\{/m);
    expect(css).not.toMatch(/^nav\s*\{/m);
    expect(css).not.toMatch(/^aside\s*\{/m);
  });

  it("uses min-width breakpoints (not max-width)", () => {
    // Mobile-first means min-width is the only responsive strategy
    expect(css).toContain("min-width");
    const maxWidthMatches = css.match(/@media\s*\(max-width/g);
    expect(maxWidthMatches).toBeNull();
  });

  it("defines @media (min-width: 768px) for two-column layout", () => {
    expect(css).toContain("@media (min-width: 768px)");
  });

  it("switches to two-column grid with minmax at 768px", () => {
    const block768 = css
      .split("min-width: 768px")[1]
      .split("@media")[0];

    expect(block768).toContain("grid-template-columns");
    expect(block768).toContain("minmax");
    expect(block768).toContain('"aside  main"');
  });

  it("defines @media (min-width: 1024px) for desktop layout", () => {
    expect(css).toContain("@media (min-width: 1024px)");
  });

  it("uses var(--gap-*) and var(--space-*) tokens for spacing (no hardcoded values)", () => {
    expect(css).toContain("var(--gap-");
    expect(css).toContain("var(--space-");
  });

  it("single-column layout by default (mobile base state)", () => {
    // Default (no media query) should be single-column
    const defaultBlock = css.split("@media")[0];
    expect(defaultBlock).toContain("grid-template-columns: 1fr");
    expect(defaultBlock).toContain('"header"');
    expect(defaultBlock).toContain('"main"');
  });
});
