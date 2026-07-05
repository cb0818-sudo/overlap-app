"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

const STORAGE_KEY = "overlap:theme";
const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((l) => l());
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function getSnapshot(): "dark" | "light" {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark";
}

// Used only for the very first client render during hydration, so it
// matches whatever the server rendered — avoids a hydration mismatch.
// The inline script in layout.tsx already applies the real theme to
// <html> before paint, so any mismatch here self-corrects within a
// single frame right after hydration.
function getServerSnapshot(): "dark" | "light" {
  return "dark";
}

function setGlobalTheme(theme: "dark" | "light") {
  document.documentElement.setAttribute("data-theme", theme);
  window.localStorage.setItem(STORAGE_KEY, theme);
  notify();
}

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    setGlobalTheme(theme === "light" ? "dark" : "light");
  }

  return (
    <button
      onClick={toggle}
      aria-label="Toggle light/dark theme"
      className="fixed right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-hairline bg-raise-1 text-muted transition-colors hover:text-surface"
    >
      {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}
