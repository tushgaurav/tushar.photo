"use client"

import { useState, useTransition } from "react"

import { revalidateEverything } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

/**
 * Escape hatch for when content was changed outside the admin (directly in the
 * database, say) and the cached pages have not been told about it.
 */
export function RevalidateButton() {
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await revalidateEverything()
          setDone(true)
          setTimeout(() => setDone(false), 2000)
        })
      }
    >
      {pending ? "Refreshing…" : done ? "Refreshed" : "Refresh site cache"}
    </Button>
  )
}
