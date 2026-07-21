/* ============================================================
   ThemeToggle — Dark/Light Mode Toggle
   ============================================================ */

import { useTheme } from "../contexto/ThemeProvider";

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={theme === "dark" ? "Modo claro" : "Modo oscuro"}
      style={{
        background: "none",
        border: "2px solid rgba(255,255,255,0.3)",
        borderRadius: "50%",
        width: 36,
        height: 36,
        fontSize: 18,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        transition: "all 0.2s ease",
        marginLeft: 12,
      }}
    >
      {theme === "dark" ? "☀️" : "🌙"}
    </button>
  );
};

export default ThemeToggle;
