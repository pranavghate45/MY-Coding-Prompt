"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "mix";

type ThemeContextValue = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);
const THEME_STORAGE_KEY = "my-prompt-theme";

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
  // also toggle the `dark` class so Tailwind `dark:` utilities continue to work
  if (theme === "dark") document.documentElement.classList.add("dark");
  else document.documentElement.classList.remove("dark");
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Theme provider is a client component; avoid intercepting console errors here.
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "mix") return saved as Theme;
    const prefersDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
    // prefer the OS preference when available, otherwise default to light for better contrast
    return prefersDark ? "dark" : "light";
  });

  // whether the user explicitly picked a theme (stored in localStorage)
  const [userChosen, setUserChosen] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem(THEME_STORAGE_KEY));
  });

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // listen for OS theme changes and follow them only when the user hasn't chosen a theme
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");

    const handler = (e: Event) => {
      const mqEvent = e as MediaQueryListEvent;
      if (!userChosen) {
        setThemeState(mqEvent.matches ? "dark" : "light");
      }
    };

    // some browsers support addEventListener, others use addListener
    if (typeof (mq as unknown as { addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void }).addEventListener === "function") {
      (mq as unknown as { addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void }).addEventListener("change", handler as EventListener);
    } else if (typeof (mq as unknown as { addListener?: (l: (e: MediaQueryListEvent) => void) => void }).addListener === "function") {
      (mq as unknown as { addListener: (l: (e: MediaQueryListEvent) => void) => void }).addListener(handler as unknown as (e: MediaQueryListEvent) => void);
    }

    return () => {
      if (typeof (mq as unknown as { removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void }).removeEventListener === "function") {
        (mq as unknown as { removeEventListener: (type: string, listener: EventListenerOrEventListenerObject) => void }).removeEventListener("change", handler as EventListener);
      } else if (typeof (mq as unknown as { removeListener?: (l: (e: MediaQueryListEvent) => void) => void }).removeListener === "function") {
        (mq as unknown as { removeListener: (l: (e: MediaQueryListEvent) => void) => void }).removeListener(handler as unknown as (e: MediaQueryListEvent) => void);
      }
    };
  }, [userChosen]);

  const setTheme = (newTheme: Theme) => {
    setUserChosen(true);
    localStorage.setItem(THEME_STORAGE_KEY, newTheme);
    setThemeState(newTheme);
  };

  const toggleTheme = () => {
    // cycle through dark -> light -> mix -> dark
    setUserChosen(true);
    setThemeState((currentTheme) => {
      let next: Theme = "dark";
      if (currentTheme === "dark") next = "light";
      else if (currentTheme === "light") next = "mix";
      else next = "dark";
      localStorage.setItem(THEME_STORAGE_KEY, next);
      return next;
    });
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}


export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider");
  }
  return context;
}
