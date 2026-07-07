"use client"
import { createContext, useContext, useEffect, useState, ReactNode } from "react"

export type ThemeName = "saffron" | "teal" | "purple" | "rose" | "forest" | "indigo"

export const THEMES: { name: ThemeName; label: string; emoji: string; description: string; colors: [string, string, string, string] }[] = [
  { name: "saffron", label: "Saffron", emoji: "🟠", description: "Indian heritage · warm", colors: ["#D97706", "#B45309", "#FDE68A", "#FFFBEB"] },
  { name: "teal", label: "Teal", emoji: "🟢", description: "Finance · modern", colors: ["#0D9488", "#0F766E", "#CCFBF1", "#F0FDFA"] },
  { name: "purple", label: "Royal Purple", emoji: "🟣", description: "Premium · creative", colors: ["#7C3AED", "#6D28D9", "#EDE9FE", "#F5F3FF"] },
  { name: "rose", label: "Rose Red", emoji: "🔴", description: "Bold · energetic", colors: ["#E11D48", "#BE123C", "#FECDD3", "#FFF1F2"] },
  { name: "forest", label: "Forest Green", emoji: "🌲", description: "Calm · natural", colors: ["#15803D", "#166534", "#BBF7D0", "#F0FDF4"] },
  { name: "indigo", label: "Indigo", emoji: "🔵", description: "Corporate · trusted", colors: ["#4F46E5", "#4338CA", "#C7D2FE", "#EEF2FF"] },
]

interface ThemeCtx {
  theme: ThemeName
  setTheme: (t: ThemeName) => void
}

const ThemeContext = createContext<ThemeCtx>({ theme: "saffron", setTheme: () => {} })

export function useAppTheme() {
  return useContext(ThemeContext)
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeName>(() => {
    if (typeof window === "undefined") return "saffron"
    const saved = localStorage.getItem("billdesk-theme") as ThemeName | null
    return saved && THEMES.find((t) => t.name === saved) ? saved : "saffron"
  })

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme)
  }, [theme])

  const setTheme = (t: ThemeName) => {
    setThemeState(t)
    if (typeof window !== "undefined") localStorage.setItem("billdesk-theme", t)
  }

  return <ThemeContext.Provider value={{ theme, setTheme }}>{children}</ThemeContext.Provider>
}
