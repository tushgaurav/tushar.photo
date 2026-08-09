"use client"

import Link from "next/link"

import { reorderCategories } from "@/app/admin/actions"
import { useReorder } from "@/components/admin/use-reorder"
import type { AdminCategory } from "@/lib/queries/admin"

export function CategoryReorderList({
  categories,
  childrenByParent = {},
}: {
  categories: AdminCategory[]
  /** Sub-collections rendered indented under their parent, keyed by parent id. */
  childrenByParent?: Record<string, AdminCategory[]>
}) {
  const {
    items,
    draggingId,
    saving,
    error,
    move,
    onDragStart,
    onDragOver,
    onDragEnd,
  } = useReorder(categories, reorderCategories)

  return (
    <div className="flex flex-col gap-3">
      <div className="flex h-4 items-center">
        {saving ? (
          <p className="text-xs text-muted-foreground">Saving order…</p>
        ) : null}
        {error ? (
          <p role="alert" className="text-xs text-destructive">
            {error}
          </p>
        ) : null}
      </div>

      <ul className="divide-y divide-border border-y border-border">
        {items.map((category, index) => (
          <li
            key={category.id}
            draggable
            onDragStart={() => onDragStart(category.id)}
            onDragOver={(event) => {
              event.preventDefault()
              onDragOver(category.id)
            }}
            onDragEnd={onDragEnd}
            className={`flex flex-col py-3 ${
              draggingId === category.id ? "opacity-40" : ""
            }`}
          >
            <div className="flex items-center gap-4">
            <span
              aria-hidden="true"
              className="cursor-grab select-none px-1 text-muted-foreground"
              title="Drag to reorder"
            >
              ⠿
            </span>

            <span className="w-8 font-mono text-xs text-muted-foreground">
              {String(index + 1).padStart(2, "0")}
            </span>

            <Link
              href={`/admin/categories/${category.id}`}
              className="flex flex-1 flex-wrap items-baseline gap-x-3 gap-y-1 transition-opacity hover:opacity-60"
            >
              <span className="text-sm font-medium lowercase">
                {category.name}
              </span>
              <span className="font-mono text-xs text-muted-foreground">
                /{category.slug}
              </span>
              <span className="text-xs text-muted-foreground">
                {category.photoCount}{" "}
                {category.photoCount === 1 ? "photo" : "photos"}
              </span>
              {!category.published ? (
                <span className="text-xs font-bold tracking-widest uppercase text-destructive">
                  Draft
                </span>
              ) : null}
            </Link>

            {/* Also the keyboard-accessible and touch path, since native
                drag-and-drop provides neither. */}
            <span className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(category.id, -1)}
                disabled={index === 0}
                aria-label={`Move ${category.name} up`}
                className="size-7 rounded border border-border text-xs transition-opacity hover:opacity-60 disabled:opacity-25"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(category.id, 1)}
                disabled={index === items.length - 1}
                aria-label={`Move ${category.name} down`}
                className="size-7 rounded border border-border text-xs transition-opacity hover:opacity-60 disabled:opacity-25"
              >
                ↓
              </button>
            </span>
            </div>

            {(childrenByParent[category.id]?.length ?? 0) > 0 ? (
              <ul className="mt-1 flex flex-col gap-1 pl-14">
                {childrenByParent[category.id].map((child) => (
                  <li key={child.id}>
                    <Link
                      href={`/admin/categories/${child.id}`}
                      className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-1 transition-opacity hover:opacity-60"
                    >
                      <span aria-hidden="true" className="text-muted-foreground">
                        └
                      </span>
                      <span className="text-sm lowercase">{child.name}</span>
                      <span className="font-mono text-xs text-muted-foreground">
                        /{category.slug}/{child.slug}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {child.photoCount}{" "}
                        {child.photoCount === 1 ? "photo" : "photos"}
                      </span>
                      {!child.published ? (
                        <span className="text-xs font-bold tracking-widest uppercase text-destructive">
                          Draft
                        </span>
                      ) : null}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  )
}
