"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"

import {
  deletePhoto,
  publishAllPhotos,
  reorderPhotos,
  setPhotoLayout,
  setPhotoPublished,
} from "@/app/admin/actions"
import { PhotoUploader } from "@/components/admin/photo-uploader"
import { useReorder } from "@/components/admin/use-reorder"
import { Button } from "@/components/ui/button"
import type { AdminPhoto } from "@/lib/queries/admin"

type PhotoLayout = AdminPhoto["layout"]

const LAYOUT_OPTIONS: { value: PhotoLayout; glyph: string; title: string }[] = [
  { value: "left", glyph: "◧", title: "Image left, text right" },
  { value: "full", glyph: "▬", title: "Full width" },
  { value: "right", glyph: "◨", title: "Text left, image right" },
]

/**
 * The arrange board: a scaled-down mockup of the public gallery page.
 *
 * Each row renders the photo the way `EditorialRow` will — full width, or
 * image beside its caption — so ordering and layout decisions are made against
 * what the page actually looks like. Two drags exist side by side:
 *
 *  - the ⠿ handle reorders rows (persisted through `useReorder`)
 *  - the photo itself drags onto left / full / right zones to change layout,
 *    with the ◧ ▬ ◨ buttons as the click/touch/keyboard path, since native
 *    drag never fires on touch devices
 */
export function PhotoManager({
  categoryId,
  photos,
}: {
  categoryId: string
  photos: AdminPhoto[]
}) {
  const router = useRouter()
  const [publishingAll, startPublishAll] = useTransition()
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

  const [layoutDraggingId, setLayoutDraggingId] = useState<string | null>(null)
  /**
   * Optimistic layout per photo. Applied on top of the server data so the
   * preview snaps to the new layout on drop; reverted if the action fails.
   */
  const [layoutOverrides, setLayoutOverrides] = useState<
    Record<string, PhotoLayout>
  >({})

  async function commitLayout(photo: AdminPhoto, layout: PhotoLayout) {
    const current = layoutOverrides[photo.id] ?? photo.layout
    if (layout === current) return

    setLayoutOverrides((prev) => ({ ...prev, [photo.id]: layout }))
    const result = await setPhotoLayout(photo.id, layout)
    if (!result.ok) {
      setLayoutOverrides((prev) => ({ ...prev, [photo.id]: current }))
      toast.error(result.error)
      return
    }
    router.refresh()
  }

  const unpublishedCount = items.filter((photo) => !photo.published).length

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PhotoUploader categoryId={categoryId} />
        <div className="flex flex-wrap items-center gap-3">
          {unpublishedCount > 0 ? (
            <Button
              variant="outline"
              size="sm"
              disabled={publishingAll}
              onClick={() =>
                startPublishAll(async () => {
                  const result = await publishAllPhotos(categoryId)
                  if (!result.ok) {
                    toast.error(result.error)
                    return
                  }
                  const published = result.publishedCount ?? 0
                  const skipped = result.skippedMissingAlt ?? 0
                  if (skipped > 0) {
                    toast.success(
                      `Published ${published}. ${skipped} still need alt text.`,
                    )
                  } else {
                    toast.success(
                      published === 1
                        ? "Published 1 photo"
                        : `Published ${published} photos`,
                    )
                  }
                  router.refresh()
                })
              }
            >
              {publishingAll
                ? "Publishing…"
                : `Publish all (${unpublishedCount})`}
            </Button>
          ) : null}
          <div className="text-xs text-muted-foreground">
            {saving ? "Saving order…" : `${items.length} total`}
          </div>
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
        <>
          <p className="text-xs text-muted-foreground">
            Each row previews how the page renders. Drag ⠿ to reorder. Drag a
            photo onto a zone — or use ◧ ▬ ◨ — to change its layout.
          </p>
          <ol className="flex flex-col gap-5">
            {items.map((photo, index) => (
              <BoardRow
                key={photo.id}
                photo={photo}
                layout={layoutOverrides[photo.id] ?? photo.layout}
                index={index}
                total={items.length}
                isRowDragging={draggingId === photo.id}
                rowDragActive={draggingId !== null}
                isLayoutDragging={layoutDraggingId === photo.id}
                onRowDragStart={() => onDragStart(photo.id)}
                onRowDragOver={() => onDragOver(photo.id)}
                onRowDragEnd={onDragEnd}
                onLayoutDragStart={() => setLayoutDraggingId(photo.id)}
                onLayoutDragEnd={() => setLayoutDraggingId(null)}
                onSetLayout={(layout) => void commitLayout(photo, layout)}
                onMove={(direction) => move(photo.id, direction)}
              />
            ))}
          </ol>
        </>
      )}
    </div>
  )
}

function BoardRow({
  photo,
  layout,
  index,
  total,
  isRowDragging,
  rowDragActive,
  isLayoutDragging,
  onRowDragStart,
  onRowDragOver,
  onRowDragEnd,
  onLayoutDragStart,
  onLayoutDragEnd,
  onSetLayout,
  onMove,
}: {
  photo: AdminPhoto
  layout: PhotoLayout
  index: number
  total: number
  isRowDragging: boolean
  rowDragActive: boolean
  isLayoutDragging: boolean
  onRowDragStart: () => void
  onRowDragOver: () => void
  onRowDragEnd: () => void
  onLayoutDragStart: () => void
  onLayoutDragEnd: () => void
  onSetLayout: (layout: PhotoLayout) => void
  onMove: (direction: -1 | 1) => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const missingAlt = photo.alt.trim().length === 0

  return (
    <li
      onDragOver={(event) => {
        // Only a handle drag reorders; ignore dragover from a layout drag.
        if (!rowDragActive) return
        event.preventDefault()
        onRowDragOver()
      }}
      className={`border border-border transition-opacity ${
        isRowDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-border px-3 py-2">
        <span
          draggable
          onDragStart={(event) => {
            event.dataTransfer.effectAllowed = "move"
            event.dataTransfer.setData("text/plain", photo.id)
            onRowDragStart()
          }}
          onDragEnd={onRowDragEnd}
          aria-hidden="true"
          className="cursor-grab select-none text-muted-foreground active:cursor-grabbing"
          title="Drag to reorder"
        >
          ⠿
        </span>

        <span className="font-mono text-xs text-muted-foreground">
          {String(index + 1).padStart(2, "0")}
        </span>

        {!photo.published ? (
          <span className="border border-border px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted-foreground">
            DRAFT
          </span>
        ) : null}

        <span className="min-w-0 flex-1 truncate text-xs">
          {missingAlt ? (
            <span className="text-destructive">Missing alt text</span>
          ) : (
            <span className="text-muted-foreground">{photo.alt}</span>
          )}
        </span>

        <span
          className="flex overflow-hidden rounded border border-border"
          role="group"
          aria-label="Layout"
        >
          {LAYOUT_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              title={option.title}
              aria-pressed={layout === option.value}
              onClick={() => onSetLayout(option.value)}
              className={`size-7 text-sm leading-none transition-colors ${
                layout === option.value
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {option.glyph}
            </button>
          ))}
        </span>

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

        <span className="flex items-center gap-2">
          <Button
            variant="ghost"
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
                toast.success(
                  photo.published ? "Photo hidden" : "Photo published",
                )
                router.refresh()
              })
            }
          >
            {photo.published ? "Unpublish" : "Publish"}
          </Button>

          <Button
            variant="ghost"
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
        </span>
      </div>

      <div className={`relative p-4 md:p-6 ${photo.published ? "" : "opacity-70"}`}>
        <RowPreview
          photo={photo}
          layout={layout}
          index={index}
          dragging={isLayoutDragging}
          onDragStart={onLayoutDragStart}
          onDragEnd={onLayoutDragEnd}
        />
        {isLayoutDragging ? (
          <LayoutZones current={layout} onDrop={onSetLayout} />
        ) : null}
      </div>
    </li>
  )
}

/** The miniature of `EditorialRow`: same proportions, same placement, scaled type. */
function RowPreview({
  photo,
  layout,
  index,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  photo: AdminPhoto
  layout: PhotoLayout
  index: number
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  const exif = (
    <div className="flex gap-3 text-[9px] font-medium tracking-widest text-muted-foreground">
      {photo.camera ? <span>{photo.camera}</span> : null}
      {photo.settings ? <span>{photo.settings}</span> : null}
    </div>
  )

  if (layout === "full") {
    return (
      <figure>
        <DraggablePhoto
          photo={photo}
          aspect="aspect-[2/1]"
          dragging={dragging}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
        />
        <figcaption className="mt-2">{exif}</figcaption>
      </figure>
    )
  }

  const imageFirst = layout === "left"

  const image = (
    <DraggablePhoto
      photo={photo}
      aspect="aspect-[4/5]"
      dragging={dragging}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    />
  )

  const meta = (
    <div
      className={`flex h-full flex-col justify-between gap-4 ${
        imageFirst ? "items-start" : "items-end text-right"
      }`}
    >
      <div
        className={`flex w-full ${imageFirst ? "justify-end" : "justify-start"}`}
      >
        <span className="text-[10px] font-medium tracking-wide">
          {`[${photo.year}]`}
        </span>
      </div>

      <div className={`max-w-sm ${imageFirst ? "" : "ml-auto"}`}>
        <p className="mb-2 text-[10px] font-medium tracking-wide">
          {`[${index + 1}]`}
        </p>
        {photo.caption ? (
          <p className="line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">
            {photo.caption}
          </p>
        ) : null}
        {photo.location ? (
          <p className="mt-2 text-[9px] font-bold tracking-widest uppercase">
            {photo.location}
          </p>
        ) : null}
        <div className={`mt-3 flex ${imageFirst ? "" : "justify-end"}`}>
          {exif}
        </div>
      </div>
    </div>
  )

  return (
    <div className="grid grid-cols-5 gap-4 md:gap-6">
      {imageFirst ? (
        <>
          <div className="col-span-3">{image}</div>
          <div className="col-span-2">{meta}</div>
        </>
      ) : (
        <>
          <div className="col-span-2">{meta}</div>
          <div className="col-span-3">{image}</div>
        </>
      )}
    </div>
  )
}

function DraggablePhoto({
  photo,
  aspect,
  dragging,
  onDragStart,
  onDragEnd,
}: {
  photo: AdminPhoto
  aspect: string
  dragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
}) {
  return (
    <div
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move"
        event.dataTransfer.setData("text/plain", photo.id)
        // Defer the state change: swapping the DOM in the same tick as
        // dragstart makes some browsers cancel the drag outright.
        setTimeout(onDragStart, 0)
      }}
      onDragEnd={onDragEnd}
      title="Drag to change layout"
      className={`relative w-full cursor-grab overflow-hidden bg-black active:cursor-grabbing ${aspect} ${
        dragging ? "opacity-40" : ""
      }`}
    >
      <Image
        src={photo.previewUrl}
        alt=""
        fill
        draggable={false}
        sizes="(max-width: 768px) 100vw, 900px"
        placeholder="blur"
        blurDataURL={photo.blurDataUrl}
        className="pointer-events-none object-cover"
      />
    </div>
  )
}

/** The three drop targets shown while a photo is being dragged. */
function LayoutZones({
  current,
  onDrop,
}: {
  current: PhotoLayout
  onDrop: (layout: PhotoLayout) => void
}) {
  const [over, setOver] = useState<PhotoLayout | null>(null)

  const zones: { value: PhotoLayout; label: string }[] = [
    { value: "left", label: "IMAGE LEFT" },
    { value: "full", label: "FULL WIDTH" },
    { value: "right", label: "IMAGE RIGHT" },
  ]

  return (
    <div className="absolute inset-0 z-20 grid grid-cols-3 gap-2 bg-background/80 p-3 backdrop-blur-[2px]">
      {zones.map((zone) => {
        const isOver = over === zone.value
        const isCurrent = current === zone.value
        return (
          <div
            key={zone.value}
            onDragOver={(event) => {
              event.preventDefault()
              event.dataTransfer.dropEffect = "move"
              setOver(zone.value)
            }}
            onDragLeave={() =>
              setOver((value) => (value === zone.value ? null : value))
            }
            onDrop={(event) => {
              event.preventDefault()
              onDrop(zone.value)
            }}
            className={`flex flex-col items-center justify-center gap-1 border border-dashed text-[10px] font-bold tracking-widest transition-colors ${
              isOver
                ? "border-foreground bg-foreground/10 text-foreground"
                : isCurrent
                  ? "border-foreground/50 text-foreground/70"
                  : "border-border text-muted-foreground"
            }`}
          >
            <span>{zone.label}</span>
            {isCurrent ? (
              <span className="text-[8px] font-medium tracking-widest">
                CURRENT
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
