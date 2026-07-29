"use client"

import { useCallback, useState } from "react"

/**
 * Reordering state for a list, with optimistic local ordering.
 *
 * Uses the native HTML5 drag-and-drop API rather than a drag library, which
 * keeps the dependency surface small. Native DnD does not fire on touch
 * devices, so `move` is also exposed for the up/down buttons — those double as
 * the keyboard-accessible path, which drag alone never provides.
 */
export function useReorder<T extends { id: string }>(
  initial: T[],
  persist: (ids: string[]) => Promise<unknown>,
) {
  const [items, setItems] = useState(initial)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const commit = useCallback(
    async (next: T[]) => {
      const previous = items
      setItems(next)
      setSaving(true)
      setError(null)

      try {
        const result = await persist(next.map((item) => item.id))
        // Actions return { ok: false, error } rather than throwing.
        if (
          result &&
          typeof result === "object" &&
          "ok" in result &&
          result.ok === false
        ) {
          setItems(previous)
          setError(
            "error" in result && typeof result.error === "string"
              ? result.error
              : "Could not save the new order.",
          )
        }
      } catch {
        setItems(previous)
        setError("Could not save the new order.")
      } finally {
        setSaving(false)
      }
    },
    [items, persist],
  )

  const move = useCallback(
    (id: string, direction: -1 | 1) => {
      const from = items.findIndex((item) => item.id === id)
      const to = from + direction
      if (from === -1 || to < 0 || to >= items.length) return

      const next = [...items]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      void commit(next)
    },
    [items, commit],
  )

  const onDragStart = useCallback((id: string) => setDraggingId(id), [])

  const onDragOver = useCallback(
    (overId: string) => {
      if (!draggingId || draggingId === overId) return

      const from = items.findIndex((item) => item.id === draggingId)
      const to = items.findIndex((item) => item.id === overId)
      if (from === -1 || to === -1) return

      // Reorder live during the drag so the row visibly follows the cursor;
      // the result is only persisted on drop.
      const next = [...items]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      setItems(next)
    },
    [draggingId, items],
  )

  const onDragEnd = useCallback(() => {
    setDraggingId(null)
    void commit(items)
  }, [items, commit])

  return {
    items,
    draggingId,
    saving,
    error,
    move,
    onDragStart,
    onDragOver,
    onDragEnd,
  }
}
