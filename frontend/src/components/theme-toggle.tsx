"use client";

import { Moon, Sun, Sparkles } from "lucide-react";
import { useTheme } from "@/components/theme-provider";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  // Show compact icon-only toggle with subtle active ring
  const title = `Theme: ${theme}`;

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="btn btn-secondary p-2 h-9 w-9 inline-flex items-center justify-center"
      aria-label={title}
      title={title}
    >
      {theme === "dark" ? <Sun size={16} /> : theme === "light" ? <Sparkles size={16} /> : <Moon size={16} />}
    </button>
  );
}
