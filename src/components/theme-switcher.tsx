
"use client"

import * as React from "react"
import { useTheme } from "next-themes"
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
  { name: 'pink', label: 'Rose Bonbon', colorClass: 'bg-[hsl(340,70%,55%)]' }, // Added Pink
  { name: 'cyan', label: 'Cyan Glacé', colorClass: 'bg-[hsl(180,70%,50%)]' }, // Added Cyan
  { name: 'yellow', label: 'Jaune Soleil', colorClass: 'bg-[hsl(50,70%,50%)]' }, // Added Yellow
]

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render a placeholder or null during server rendering/hydration mismatch
    return <Button variant="outline" size="icon" disabled className="h-9 w-9"><Palette className="h-4 w-4" /></Button>;
  }

  // Filter available themes based on the provider's list
  const availableThemes = themeColors.filter(tc => themes.includes(tc.name));

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className="h-9 w-9">
          <Palette className="h-4 w-4" />
          <span className="sr-only">Changer le thème de couleur primaire</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableThemes.map((themeOption) => (
          <DropdownMenuItem
            key={themeOption.name}
            onClick={() => setTheme(themeOption.name)}
            className={cn(
              "flex items-center justify-between cursor-pointer",
              theme === themeOption.name && "bg-accent"
            )}
          >
            <div className="flex items-center gap-2">
               <span className={cn("inline-block h-4 w-4 rounded-full border", themeOption.colorClass)}></span>
              {themeOption.label}
            </div>
            {theme === themeOption.name && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
