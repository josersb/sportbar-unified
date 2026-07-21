import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ThemeProvider from "../contexto/ThemeProvider";
import ThemeToggle from "./ThemeToggle";

describe("Dark mode toggle — ThemeProvider + ThemeToggle", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute("data-theme");
  });

  // ── Initial render ────────────────────────────────────────

  it("renders a toggle button with moon emoji in light mode", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(screen.getByRole("button")).toBeInTheDocument();
    expect(screen.getByText("🌙")).toBeInTheDocument();
  });

  it("sets data-theme='light' on <html> by default", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "light"
    );
  });

  it("persists 'light' to localStorage on mount", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(localStorage.getItem("sportbar-theme")).toBe("light");
  });

  // ── Toggle behavior ───────────────────────────────────────

  it("toggles to dark mode on click — updates data-theme and emoji", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "dark"
    );
    expect(screen.getByText("☀️")).toBeInTheDocument();
  });

  it("persists 'dark' to localStorage after toggling", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button"));

    expect(localStorage.getItem("sportbar-theme")).toBe("dark");
  });

  it("toggles back to light on second click", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    fireEvent.click(screen.getByRole("button")); // → dark
    fireEvent.click(screen.getByRole("button")); // → light

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "light"
    );
    expect(localStorage.getItem("sportbar-theme")).toBe("light");
    expect(screen.getByText("🌙")).toBeInTheDocument();
  });

  // ── Restore from localStorage ─────────────────────────────

  it("restores dark theme from localStorage on mount", () => {
    localStorage.setItem("sportbar-theme", "dark");

    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    expect(document.documentElement.getAttribute("data-theme")).toBe(
      "dark"
    );
    expect(screen.getByText("☀️")).toBeInTheDocument();
  });

  // ── Accessibility ─────────────────────────────────────────

  it("provides correct aria-label based on current theme", () => {
    render(
      <ThemeProvider>
        <ThemeToggle />
      </ThemeProvider>
    );

    // Light → "Cambiar a modo oscuro"
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Cambiar a modo oscuro"
    );

    fireEvent.click(screen.getByRole("button")); // → dark

    // Dark → "Cambiar a modo claro"
    expect(screen.getByRole("button")).toHaveAttribute(
      "aria-label",
      "Cambiar a modo claro"
    );
  });
});
