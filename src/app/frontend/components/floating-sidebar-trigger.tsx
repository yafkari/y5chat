"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { useSidebar } from "@/components/ui/sidebar";
import { PanelLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";

interface FloatingSidebarTriggerProps {
  className?: string;
}

export function FloatingSidebarTrigger({
  className,
}: FloatingSidebarTriggerProps) {
  const { toggleSidebar, open } = useSidebar();

  if (!open) {
    return null;
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "pointer-events-auto fixed left-2 z-50 flex flex-row gap-0.5 p-1 top-2",
            "safe-area-inset-top", // For mobile safe area
            className
          )}
        >
          {/* Backdrop blur effect */}
          {/* <div
        className={cn(
          "pointer-events-none absolute inset-0 right-auto -z-10 rounded-md backdrop-blur-sm",
          "transition-[background-color,width] delay-125 duration-250",
          "w-[6.75rem] bg-sidebar/50 blur-fallback:bg-sidebar",
          "max-sm:delay-125 max-sm:duration-250 max-sm:w-[6.75rem] max-sm:bg-sidebar/50",
          open && "hidden"
        )}
      /> */}

          {/* Sidebar Toggle Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleSidebar}
            className={cn(
              "z-10 h-8 w-8 text-primary",
              "hover:bg-muted/40 hover:secondary-foreground",
              "disabled:hover:bg-transparent disabled:hover:text-foreground/50"
            )}
            data-sidebar="trigger"
          >
            <PanelLeft className="h-4 w-4" strokeWidth={2.5} />
            <span className="sr-only">Toggle Sidebar</span>
          </Button>
        </div>
      </TooltipTrigger>
      <TooltipContent>
        {open ? "Close sidebar" : "Open sidebar"} (Ctrl + K)
      </TooltipContent>
    </Tooltip>
  );
}
