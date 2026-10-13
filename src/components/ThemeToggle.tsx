import { useEffect, useState } from "react";
import { Sun, Moon } from "./icons";

export type Theme = "dark" | "light";

export function getStoredTheme(): Theme {
  try {
    const saved = localStorage.getItem("ja_legal_theme");
    if (saved === "light" || saved === "dark") {
      return saved;
    }
  } catch {}
  return "dark";
}

export function applyTheme(theme: Theme) {
  try {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(theme);

    if (document.body) {
      document.body.classList.remove("theme-light", "theme-dark");
      document.body.classList.add(`theme-${theme}`);
    }

    localStorage.setItem("ja_legal_theme", theme);
    window.dispatchEvent(new CustomEvent("themechange", { detail: theme }));
  } catch (e) {
    console.warn("Error applying theme", e);
  }
}

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className = "" }: ThemeToggleProps) {
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());

  useEffect(() => {
    applyTheme(theme);

    const handleExternalChange = (e: Event) => {
      const customEvent = e as CustomEvent<Theme>;
      if (customEvent.detail && customEvent.detail !== theme) {
        setTheme(customEvent.detail);
      }
    };

    window.addEventListener("themechange", handleExternalChange);
    return () => window.removeEventListener("themechange", handleExternalChange);
  }, [theme]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    applyTheme(nextTheme);
  };

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`theme-toggle-btn ${className}`}
      aria-label={isDark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"}
      title={isDark ? "Modo oscuro activo (clic para modo claro)" : "Modo claro activo (clic para modo oscuro)"}
    >
      <span className="theme-toggle-track">
        <span className={`theme-toggle-thumb ${isDark ? "dark" : "light"}`}>
          {isDark ? (
            <Moon size={14} color="#d9b56a" />
          ) : (
            <Sun size={14} color="#b38234" />
          )}
        </span>
      </span>
      <span className="theme-toggle-label">
        {isDark ? "Oscuro" : "Claro"}
      </span>
    </button>
  );
}
