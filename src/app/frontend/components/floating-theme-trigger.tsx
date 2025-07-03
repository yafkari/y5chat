"use client"

import { Button } from "@/components/ui/button"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"
import { useTheme } from "next-themes"

export function FloatingThemeTrigger() {
  const { setTheme, theme } = useTheme()
  return (
    <div className={cn(
      "pointer-events-auto fixed right-4 z-50 flex flex-row gap-0.5 p-1 top-2",
      "safe-area-inset-top", // For mobile safe area
    )}>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setTheme(theme => theme === "dark" ? "light" : "dark")}
        className={cn(
          "z-10 h-8 w-8 text-primary",
          "hover:bg-muted/40 hover:text-secondary-foreground",
          "disabled:hover:bg-transparent disabled:hover:text-primary/50",
        )}
        data-sidebar="trigger"
      >
        {theme === "dark" ? <Sun className="h-4 w-4" strokeWidth={2.5} /> : <Moon className="h-4 w-4" strokeWidth={2.5} />}
        <span className="sr-only">Toggle Theme</span>
      </Button>
    </div>
  )
} 