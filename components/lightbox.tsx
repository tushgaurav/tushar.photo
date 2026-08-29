"use client"

import { useCallback, useEffect } from "react"
import Image from "next/image"
import { AnimatePresence, motion } from "framer-motion"
import { ChevronLeft, ChevronRight, MapPin } from "lucide-react"
import type { Photo } from "@/lib/content"

const ease = [0.32, 0.72, 0, 1] as const

export function Lightbox({
  photos,
  openIndex,
  onClose,
  onNavigate,
  categoryName,
}: {
  photos: Photo[]
  openIndex: number | null
  onClose: () => void
  onNavigate: (index: number) => void
  categoryName: string
}) {
  const isOpen = openIndex !== null
  const photo = isOpen ? photos[openIndex] : null

  const goPrev = useCallback(() => {
    if (openIndex === null) return
    onNavigate((openIndex - 1 + photos.length) % photos.length)
  }, [openIndex, photos.length, onNavigate])

  const goNext = useCallback(() => {
    if (openIndex === null) return
    onNavigate((openIndex + 1) % photos.length)
  }, [openIndex, photos.length, onNavigate])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
    }
    window.addEventListener("keydown", onKey)
    document.body.style.overflow = "hidden"
    return () => {
      window.removeEventListener("keydown", onKey)
      document.body.style.overflow = ""
    }
  }, [isOpen, onClose, goPrev, goNext])

  return (
    <AnimatePresence>
      {isOpen && photo ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease }}
          className="fixed inset-0 z-50 flex flex-col bg-foreground text-background"
          role="dialog"
          aria-modal="true"
          aria-label={`${categoryName} photo ${openIndex + 1} of ${photos.length}`}
        >
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-4 md:px-8 md:py-6">
            <span className="text-xs font-bold tracking-widest md:text-sm">
              {`${String(openIndex + 1).padStart(2, "0")}/${String(photos.length).padStart(2, "0")}`}
            </span>
            <span className="hidden text-xs font-medium tracking-widest uppercase md:block">
              {categoryName}
            </span>
            <button
              type="button"
              onClick={onClose}
              data-cursor="close"
              className="text-xs font-bold tracking-widest transition-opacity hover:opacity-50 md:text-sm"
            >
              {"[ CLOSE ]"}
            </button>
          </div>

          {/* Image */}
          <div className="relative flex min-h-0 flex-1 items-center justify-center px-4 md:px-16">
            <button
              type="button"
              onClick={goPrev}
              aria-label="Previous photo"
              data-cursor="prev"
              className="group absolute top-0 bottom-0 left-0 z-10 w-1/4 md:w-1/3"
            >
              <ChevronLeft
                aria-hidden="true"
                strokeWidth={1.5}
                className="pointer-events-none absolute top-1/2 left-2 size-7 -translate-y-1/2 opacity-40 transition-opacity group-hover:opacity-100 md:left-5 md:size-8"
              />
            </button>
            <AnimatePresence mode="wait">
              <motion.div
                key={photo.src}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                transition={{ duration: 0.4, ease }}
                className="relative h-full w-full"
              >
                <Image
                  src={photo.src || "/placeholder.svg"}
                  alt={photo.alt}
                  fill
                  sizes="100vw"
                  priority
                  className="object-contain"
                />
              </motion.div>
            </AnimatePresence>
            <button
              type="button"
              onClick={goNext}
              aria-label="Next photo"
              data-cursor="next"
              className="group absolute top-0 right-0 bottom-0 z-10 w-1/4 md:w-1/3"
            >
              <ChevronRight
                aria-hidden="true"
                strokeWidth={1.5}
                className="pointer-events-none absolute top-1/2 right-2 size-7 -translate-y-1/2 opacity-40 transition-opacity group-hover:opacity-100 md:right-5 md:size-8"
              />
            </button>
          </div>

          {/* Metadata bar */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`meta-${photo.src}`}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.35, ease, delay: 0.1 }}
              className="flex flex-col gap-2 px-4 py-4 md:flex-row md:items-end md:justify-between md:px-8 md:py-6"
            >
              <div className="max-w-md">
                {photo.caption ? (
                  <p className="text-sm leading-relaxed font-medium">
                    {photo.caption}
                  </p>
                ) : null}
                {photo.location ? (
                  <p className="mt-1.5 flex items-center gap-1.5 text-[10px] font-bold tracking-widest uppercase opacity-60 md:text-xs">
                    <MapPin className="size-3 shrink-0" aria-hidden="true" />
                    {photo.location}
                  </p>
                ) : null}
              </div>
              <div className="flex gap-6 text-[10px] font-medium tracking-widest opacity-60 md:text-xs">
                <span>{photo.camera}</span>
                <span>{photo.lens}</span>
                <span>{photo.settings}</span>
              </div>
            </motion.div>
          </AnimatePresence>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
