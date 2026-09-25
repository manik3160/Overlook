"use client"

import { Moon, Sun } from "lucide-react"
import { Button } from "@/components/ui/button"

// Toggles the `dark` class and persists the choice. The pre-paint script in layout.tsx applies it on load.
export default function ThemeToggle() {
  function toggle() {
    const dark = !document.documentElement.classList.contains("dark")
    document.documentElement.classList.toggle("dark", dark)
    try { localStorage.setItem("overlook-theme", dark ? "dark" : "light") } catch { /* private mode: the choice just isn't remembered */ }
  }
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label="Toggle theme">
      <Sun size={16} strokeWidth={1.5} className="hidden dark:block" />
      <Moon size={16} strokeWidth={1.5} className="dark:hidden" />
    </Button>
  )
}
