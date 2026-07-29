"use client"

import { Toaster as SonnerToaster } from "sonner"

/**
 * Sonner wired to the app's design tokens. The stock shadcn wrapper reads the
 * active theme from next-themes; this project has no theme provider and the
 * admin is always light, so the palette is applied directly instead.
 */
export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group flex w-full items-center gap-3 rounded-md border border-border bg-background p-4 text-sm text-foreground shadow-lg",
          description: "text-muted-foreground",
          actionButton: "bg-foreground text-background",
          cancelButton: "bg-muted text-muted-foreground",
          error: "border-destructive/40 text-destructive",
        },
      }}
    />
  )
}
