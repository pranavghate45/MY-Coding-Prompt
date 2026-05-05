"use client";

import React from "react";
import { useTheme } from "@/components/theme-provider";
import { ProjectLogo } from "@/components/project-logo";

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  function cycleTheme() {
    if (theme === "dark") setTheme("light");
    else if (theme === "light") setTheme("mix");
    else setTheme("dark");
  }

  return (
    <div>
      <button
        onClick={cycleTheme}
        className="inline-flex items-center justify-center w-10 h-10 rounded-lg border border-[var(--app-border)] bg-[var(--app-surface-2)] p-0"
        title={`Theme: ${theme}`}
        aria-label={`Theme: ${theme}`}
      >
        <ProjectLogo compact={true} size={16} />
      </button>
    </div>
  );
}
