
"use client"

import * as React from "react"
import { Palette, Check } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "@/lib/utils"

const themeColors = [
  { name: 'red', label: 'Rouge Sang', colorClass: 'bg-[hsl(0,65%,45%)]' },
  { name: 'blue', label: 'Bleu Abyssal', colorClass: 'bg-[hsl(210,70%,50%)]' },
  { name: 'green', label: 'Vert Forêt', colorClass: 'bg-[hsl(140,60%,35%)]' },
  { name: 'purple', label: 'Violet Ombre', colorClass: 'bg-[hsl(270,50%,50%)]' },
  { name: 'orange', label: 'Orange Braise', colorClass: 'bg-[hsl(30,70%,45%)]' },
  { name: 'pink', label: 'Rose Bonbon', colorClass: 'bg-[hsl(340,70%,55%)]' },
  { name: 'cyan', label: 'Cyan Glacé', colorClass: 'bg-[hsl(180,70%,50%)]' },
  { name: 'yellow', label: 'Jaune Soleil', colorClass: 'bg-[hsl(50,70%,50%)]' },
  { name: 'teal', label: 'Turquoise Profond', colorClass: 'bg-[hsl(160,60%,40%)]' },
  { name: 'indigo', label: 'Indigo Mystique', colorClass: 'bg-[hsl(250,60%,50%)]' },
  { name: 'lime', label: 'Vert Citron', colorClass: 'bg-[hsl(90,60%,45%)]' },
  { name: 'amber', label: 'Ambre Doré', colorClass: 'bg-[hsl(40,70%,50%)]' },
  { name: 'fuchsia', label: 'Fuchsia Éclatant', colorClass: 'bg-[hsl(300,70%,50%)]' },
  { name: 'sky', label: 'Bleu Ciel', colorClass: 'bg-[hsl(195,70%,50%)]' },
  { name: 'emerald', label: 'Émeraude Sombre', colorClass: 'bg-[hsl(150,60%,35%)]' },
  { name: 'crimson', label: 'Cramoisi Intense', colorClass: 'bg-[hsl(350,70%,45%)]' },
  { name: 'gold', label: 'Or Scintillant', colorClass: 'bg-[hsl(50,70%,45%)]' },
  { name: 'slate', label: 'Ardoise Sombre', colorClass: 'bg-[hsl(220,20%,40%)]' },
]

const PRIMARY_THEME_KEY = "iaventures-primary-theme";

export function ThemeSwitcher() {
  const [mounted, setMounted] = React.useState(false)
  const [currentPrimaryTheme, setCurrentPrimaryTheme] = React.useState<string | null>(null);

  React.useEffect(() => {
    setMounted(true);
    const storedTheme = localStorage.getItem(PRIMARY_THEME_KEY);
    if (storedTheme && themeColors.some(tc => tc.name === storedTheme)) {
      document.documentElement.setAttribute('data-theme-primary', storedTheme);
      setCurrentPrimaryTheme(storedTheme);
    } else {
      // Set default if nothing stored or invalid
      const defaultTheme = 'red'; // Or your preferred default
      document.documentElement.setAttribute('data-theme-primary', defaultTheme);
      localStorage.setItem(PRIMARY_THEME_KEY, defaultTheme);
      setCurrentPrimaryTheme(defaultTheme);
    }
  }, [])

  const setPrimaryTheme = (themeName: string) => {
    document.documentElement.setAttribute('data-theme-primary', themeName);
    localStorage.setItem(PRIMARY_THEME_KEY, themeName);
    setCurrentPrimaryTheme(themeName);
  }

  if (!mounted) {
    // Render a placeholder or null during server rendering/hydration mismatch
    return <Button variant="outline" size="icon" disabled className="h-9 w-9"><Palette className="h-4 w-4" /></Button>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Changer le thème de couleur primaire</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {themeColors.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.name}
            onClick={() => setPrimaryTheme(themeOption.name)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              currentPrimaryTheme === themeOption.name && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
               <span className={cn("inline-block h-4 w-4 rounded-full border", themeOption.colorClass)}></span>
              {themeOption.label}
            </div>
            {currentPrimaryTheme === themeOption.name && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
