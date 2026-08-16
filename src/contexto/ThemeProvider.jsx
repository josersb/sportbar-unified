/* ============================================================
   ThemeProvider — Dark/Light Mode Infrastructure
   ============================================================
   Reads localStorage("sportbar-theme") on mount and sets
   `data-theme` attribute on <html>. Defaults to "light".
   Provides theme context with toggle function.
   ============================================================ */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "sportbar-theme";
const DEFAULT_THEME = "light";

const ThemeContext = createContext({
  theme: DEFAULT_THEME,
  toggleTheme: () => {},
});

export const useTheme = () => useContext(ThemeContext);

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved || DEFAULT_THEME;
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
