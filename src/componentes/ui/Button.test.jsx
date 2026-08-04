import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import Button from "./Button";
import styles from "./Button.module.css";

// Raw source of the CSS module — used to verify token usage without style computation.
// Relative path resolves against vitest's cwd (project root).
const buttonCss = readFileSync("src/componentes/ui/Button.module.css", "utf8");

describe("Button — variants (BTN-01)", () => {
  it.each(["primary", "secondary", "danger", "ghost", "outline"])(
    "renders variant %s with its class",
    (variant) => {
      render(<Button variant={variant}>Etiqueta</Button>);
      const btn = screen.getByRole("button", { name: "Etiqueta" });
      expect(btn.className).toContain(styles[`btn--${variant}`]);
    }
  );
});

describe("Button — sizes (BTN-02)", () => {
  it.each(["sm", "md", "lg"])("renders size %s with its class", (size) => {
    render(<Button size={size}>Etiqueta</Button>);
    const btn = screen.getByRole("button", { name: "Etiqueta" });
    expect(btn.className).toContain(styles[`btn--${size}`]);
  });
});

describe("Button — defaults and class composition", () => {
  it("defaults to primary + md", () => {
    render(<Button>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn.className).toContain(styles["btn--primary"]);
    expect(btn.className).toContain(styles["btn--md"]);
  });

  it("merges className with internal classes", () => {
    render(<Button className="extra-clase">Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn.className).toContain("extra-clase");
    expect(btn.className).toContain(styles.btn);
  });

  it("forwards data-testid to the rendered element", () => {
    render(<Button data-testid="btn-test">Click</Button>);
    expect(screen.getByTestId("btn-test")).toBeInTheDocument();
  });

  it("renders a button with type=button by default", () => {
    render(<Button>Click</Button>);
    expect(screen.getByRole("button", { name: "Click" })).toHaveAttribute("type", "button");
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<Button onClick={onClick}>Click</Button>);
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});

describe("Button — selected state (BTN-04)", () => {
  it("adds the selected class when selected", () => {
    render(<Button selected>DTV1</Button>);
    const btn = screen.getByRole("button", { name: "DTV1" });
    expect(btn.className).toContain(styles["btn--selected"]);
  });

  it("does not add the selected class when not selected", () => {
    render(<Button>DTV1</Button>);
    const btn = screen.getByRole("button", { name: "DTV1" });
    expect(btn.className).not.toContain(styles["btn--selected"]);
  });
});

describe("Button — disabled state (BTN-03, A11Y-08)", () => {
  it("sets native disabled and aria-disabled=true", () => {
    render(<Button disabled>Click</Button>);
    const btn = screen.getByRole("button", { name: "Click" });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute("aria-disabled", "true");
  });

  it("does not fire onClick when disabled", () => {
    const onClick = vi.fn();
    render(
      <Button disabled onClick={onClick}>
        Click
      </Button>
    );
    fireEvent.click(screen.getByRole("button", { name: "Click" }));
    expect(onClick).not.toHaveBeenCalled();
  });
});

describe("Button — loading state (BTN-03, BTN-10, A11Y-07)", () => {
  it("sets aria-busy=true, disables the button and renders the spinner", () => {
    render(<Button loading>Guardando</Button>);
    const btn = screen.getByRole("button", { name: "Guardando" });
    expect(btn).toHaveAttribute("aria-busy", "true");
    expect(btn).toBeDisabled();
    expect(btn.querySelector("svg")).toBeInTheDocument();
  });

  it("blocks clicks while loading (3 clicks → 0 calls)", () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Guardando
      </Button>
    );
    const btn = screen.getByRole("button", { name: "Guardando" });
    fireEvent.click(btn);
    fireEvent.click(btn);
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("announces Cargando... when loading an icon-only button", () => {
    render(<Button icon={<svg data-testid="icono" />} loading />);
    const btn = screen.getByRole("button", { name: "Cargando..." });
    expect(btn).toHaveAttribute("aria-busy", "true");
  });
});

describe("Button — as prop (BTN-05)", () => {
  it("renders <input type=submit> when as=input", () => {
    render(<Button as="input" value="Enviar" />);
    const input = screen.getByRole("button", { name: "Enviar" });
    expect(input.tagName).toBe("INPUT");
    expect(input).toHaveAttribute("type", "submit");
    expect(input).toHaveValue("Enviar");
  });

  it("uses children as the input value when no value prop is given", () => {
    render(<Button as="input">Enviar</Button>);
    expect(screen.getByRole("button", { name: "Enviar" })).toHaveValue("Enviar");
  });
});

describe("Button — icon (BTN-06)", () => {
  it("renders the icon before the text with the icon class", () => {
    render(
      <Button icon={<svg data-testid="icono" />}>Texto</Button>
    );
    const btn = screen.getByRole("button", { name: "Texto" });
    expect(btn.className).toContain(styles["btn--icon"]);
    expect(screen.getByTestId("icono")).toBeInTheDocument();
  });

  it("forwards aria-label for icon-only buttons", () => {
    render(<Button icon={<svg data-testid="icono" />} aria-label="Cerrar panel" />);
    expect(
      screen.getByRole("button", { name: "Cerrar panel" })
    ).toHaveAttribute("aria-label", "Cerrar panel");
  });
});

describe("Button — a11y surface (A11Y-05, A11Y-10)", () => {
  it("declares the 44px touch target via token (WCAG 2.5.8)", () => {
    expect(buttonCss).toContain("min-height: var(--touch-target-min)");
    expect(buttonCss).toContain("min-width: var(--touch-target-min)");
  });

  it("declares a focus-visible ring via tokens (no ring on mouse click)", () => {
    expect(buttonCss).toContain(":focus-visible");
    expect(buttonCss).toContain("outline: var(--focus-ring-width) solid var(--focus-ring-color)");
    expect(buttonCss).toContain("outline-offset: var(--focus-ring-offset)");
  });

  it("uses only --btn-* and shared tokens — no hardcoded colors", () => {
    expect(buttonCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(buttonCss).not.toMatch(/rgba?\(/);
  });
});
