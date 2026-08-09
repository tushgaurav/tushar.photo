"use client"

import { useState, useTransition } from "react"

import { deleteCategory } from "@/app/admin/actions"
import { TextInput } from "@/components/admin/field"
import { Button } from "@/components/ui/button"

/**
 * Requires typing the collection name to confirm. Deletion cascades to every
 * photo record, so a single misplaced click should not be enough.
 */
export function DeleteCategoryButton({
  categoryId,
  categoryName,
}: {
  categoryId: string
  categoryName: string
}) {
  const [confirming, setConfirming] = useState(false)
  const [typed, setTyped] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  if (!confirming) {
    return (
      <Button variant="destructive" onClick={() => setConfirming(true)}>
        Delete Collection
      </Button>
    )
  }

  return (
    <div className="flex max-w-sm flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Type <span className="font-mono text-foreground">{categoryName}</span> to
        confirm.
      </p>
      <TextInput
        value={typed}
        onChange={(event) => setTyped(event.target.value)}
        autoFocus
        aria-label={`Type ${categoryName} to confirm deletion`}
      />
      <div className="flex gap-2">
        <Button
          variant="destructive"
          disabled={typed !== categoryName || pending}
          onClick={() =>
            startTransition(async () => {
              // On success this never resolves — the action redirects away.
              const result = await deleteCategory(categoryId)
              if (!result.ok) setError(result.error)
            })
          }
        >
          {pending ? "Deleting…" : "Delete Permanently"}
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setConfirming(false)
            setTyped("")
            setError(null)
          }}
        >
          Cancel
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
