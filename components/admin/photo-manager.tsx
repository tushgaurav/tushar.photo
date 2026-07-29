"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  deletePhoto,
  reorderPhotos,
  setPhotoPublished,
} from "@/app/admin/actions"
import { PhotoUploader } from "@/components/admin/photo-uploader"
import { useReorder } from "@/components/admin/use-reorder"
import { Button } from "@/components/ui/button"
import type { AdminPhoto } from "@/lib/queries/admin"

export function PhotoManager({
  categoryId,
  photos,
}: {
  categoryId: string
  photos: AdminPhoto[]
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
  } = useReorder(photos, (ids) => reorderPhotos(categoryId, ids))

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PhotoUploader categoryId={categoryId} />
        <div className="text-xs text-muted-foreground">
          {saving ? "Saving order…" : `${items.length} total`}
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No photos yet. Upload the first one above.
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((photo, index) => (
            <PhotoRow
              key={photo.id}
              photo={photo}
              index={index}
              total={items.length}
              isDragging={draggingId === photo.id}
              onDragStart={() => onDragStart(photo.id)}
              onDragOver={() => onDragOver(photo.id)}
              onDragEnd={onDragEnd}
              onMove={(direction) => move(photo.id, direction)}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function PhotoRow({
  photo,
  index,
  total,
  isDragging,
  onDragStart,
  onDragOver,
  onDragEnd,
  onMove,
}: {
  photo: AdminPhoto
  index: number
  total: number
  isDragging: boolean
  onDragStart: () => void
  onDragOver: () => void
  onDragEnd: () => void
  onMove: (direction: -1 | 1) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const missingAlt = photo.alt.trim().length === 0

  return (
    <li
      draggable
      onDragStart={onDragStart}
      onDragOver={(event) => {
        event.preventDefault()
        onDragOver()
      }}
      onDragEnd={onDragEnd}
      className={`flex flex-wrap items-center gap-4 border border-border p-3 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <span
        aria-hidden="true"
        className="cursor-grab select-none text-muted-foreground"
        title="Drag to reorder"
      >
        ⠿
      </span>

      <span className="w-6 font-mono text-xs text-muted-foreground">
        {String(index + 1).padStart(2, "0")}
      </span>

      <div className="relative size-16 shrink-0 overflow-hidden bg-black">
        <Image
          src={photo.thumbUrl}
          alt=""
          fill
          sizes="64px"
          className="object-cover grayscale"
        />
      </div>

      <div className="flex min-w-48 flex-1 flex-col gap-1">
        <p className="text-sm">
          {missingAlt ? (
            <span className="text-destructive">Missing alt text</span>
          ) : (
            photo.alt
          )}
        </p>
        <p className="flex flex-wrap gap-x-3 text-xs text-muted-foreground">
          <span className="font-mono">{photo.layout}</span>
          <span>{photo.year}</span>
          {photo.location ? <span>{photo.location}</span> : null}
          <span>
            {photo.width}×{photo.height}
          </span>
        </p>
      </div>

      <span className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label="Move up"
          className="size-7 rounded border border-border text-xs transition-opacity hover:opacity-60 disabled:opacity-25"
        >
          ↑
        </button>
        <button
          type="button"
          onClick={() => onMove(1)}
          disabled={index === total - 1}
          aria-label="Move down"
          className="size-7 rounded border border-border text-xs transition-opacity hover:opacity-60 disabled:opacity-25"
        >
          ↓
        </button>
      </span>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await setPhotoPublished(
                photo.id,
                !photo.published,
              )
              if (!result.ok) {
                toast.error(result.error)
                return
              }
              toast.success(photo.published ? "Photo hidden" : "Photo published")
              router.refresh()
            })
          }
        >
          {photo.published ? "Unpublish" : "Publish"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/admin/photos/${photo.id}`} />}
        >
          Edit
        </Button>

        {confirmingDelete ? (
          <>
            <Button
              variant="destructive"
              size="sm"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deletePhoto(photo.id)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  setConfirmingDelete(false)
                  toast.success("Photo deleted")
                  router.refresh()
                })
              }
            >
              Confirm
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setConfirmingDelete(false)}
            >
              Cancel
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setConfirmingDelete(true)}
          >
            Delete
          </Button>
        )}
      </div>
    </li>
  )
}
