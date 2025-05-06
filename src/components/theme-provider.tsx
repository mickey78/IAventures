
"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes/dist/types"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  // If attribute is 'class', it handles light/dark mode.
  // The existing ThemeSwitcher will separately manage 'data-theme-primary' on the html tag.
  // To allow both, we ensure ThemeProvider (for light/dark) and ThemeSwitcher (for primary color)
  // target different attributes or mechanisms.
  // NextThemesProvider by default sets class on <html>.
  // Our ThemeSwitcher sets data-theme-primary on <html>.
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
