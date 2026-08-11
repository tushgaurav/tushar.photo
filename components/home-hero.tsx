"use client"

import { useCallback, useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import type { Category } from "@/lib/content"
import { usePageTransition } from "@/components/page-transition"
import { SignatureMark } from "@/components/signature-mark"
import { SiteMenu } from "@/components/site-menu"

export function HomeHero({ categories }: { categories: Category[] }) {
  const [active, setActive] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)
  const { navigate } = usePageTransition()

  const goPrev = useCallback(() => {
    setActive((a) => (a - 1 + categories.length) % categories.length)
  }, [categories.length])
  const goNext = useCallback(() => {
    setActive((a) => (a + 1) % categories.length)
  }, [categories.length])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // The menu covers the filmstrip, so it owns the keyboard while open.
      if (menuOpen) return
      // Don't hijack keys when a link/button has focus (Enter should act natively)
      const tag = (document.activeElement?.tagName ?? "").toLowerCase()
      if (e.key === "ArrowLeft") goPrev()
      if (e.key === "ArrowRight") goNext()
      if (e.key === "Enter" && tag !== "a" && tag !== "button") {
        const current = categories[active]
        if (current) navigate(`/${current.slug}`, current.name)
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [goPrev, goNext, active, navigate, categories, menuOpen])

  const category = categories[active]

  // Content is editable now, so an empty or partially-filled database is a real
  // state rather than an impossible one.
  if (!category) return null

  // Server-built: own photos, or the sub-collections' photos for a
  // sub-collection-only category like "events".
  const photos = category.heroPhotos
  const centerPhoto = photos[0]

  if (!centerPhoto) return null

  /**
   * The filmstrip wants three thumbnails either side, drawn only from the
   * active category. Categories with fewer than seven photos cycle through
   * their own photos again rather than borrowing from other categories.
   */
  const thumbs = Array.from(
    { length: 6 },
    (_, i) => photos[(i + 1) % photos.length],
  )

  const leftThumbs = thumbs.slice(0, 3)
  const rightThumbs = thumbs.slice(3, 6)

  return (
    <main className="flex min-h-[calc(100svh-0.75rem)] flex-col overflow-hidden md:min-h-[calc(100svh-1.25rem)]">
      {/* Filmstrip */}
      <div className="flex items-start justify-center gap-2 px-3 pt-3 md:gap-5 md:px-8 md:pt-8">
        {leftThumbs.map((photo, i) => (
          <Thumb
            key={`${category.slug}-l-${i}`}
            src={photo.src}
            alt={photo.alt}
            delay={i * 0.06}
            className={i < 1 ? "hidden lg:block" : i < 2 ? "hidden sm:block" : ""}
          />
        ))}

        {/* Center enlarged photo with PREV / NEXT */}
        <div className="relative w-[44%] shrink-0 sm:w-[30%] md:w-[19%]">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous collection"
            className="absolute top-[58%] right-full mr-3 hidden -translate-y-1/2 text-xs font-bold tracking-widest whitespace-nowrap transition-opacity hover:opacity-50 sm:block md:mr-8 md:text-sm"
          >
            {"[ PREV ]"}
          </button>

          <Link
            href={`/${category.slug}`}
            data-cursor="view"
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
              e.preventDefault()
              navigate(`/${category.slug}`, category.name)
            }}
            className="group block"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
              <AnimatePresence mode="popLayout">
                <motion.div
                  key={category.slug}
                  initial={{ opacity: 0, scale: 1.06 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
                  className="absolute inset-0"
                >
                  <Image
                    src={centerPhoto.src || "/placeholder.svg"}
                    alt={centerPhoto.alt}
                    fill
                    priority
                    sizes="(max-width: 768px) 44vw, 19vw"
                    className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                  />
                </motion.div>
              </AnimatePresence>
            </div>
            <span className="sr-only">{`View ${category.name} collection`}</span>
          </Link>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next collection"
            className="absolute top-[58%] left-full ml-3 hidden -translate-y-1/2 text-xs font-bold tracking-widest whitespace-nowrap transition-opacity hover:opacity-50 sm:block md:ml-8 md:text-sm"
          >
            {"[ NEXT ]"}
          </button>
        </div>

        {rightThumbs.map((photo, i) => (
          <Thumb
            key={`${category.slug}-r-${i}`}
            src={photo.src}
            alt={photo.alt}
            delay={0.18 + i * 0.06}
            className={i > 1 ? "hidden lg:block" : i > 0 ? "hidden sm:block" : ""}
          />
        ))}
      </div>

      {/* Mobile prev/next */}
      <div className="flex items-center justify-center gap-12 pt-6 sm:hidden">
        <button
          type="button"
          onClick={goPrev}
          className="text-xs font-bold tracking-widest"
          aria-label="Previous collection"
        >
          {"[ PREV ]"}
        </button>
        <button
          type="button"
          onClick={goNext}
          className="text-xs font-bold tracking-widest"
          aria-label="Next collection"
        >
          {"[ NEXT ]"}
        </button>
      </div>

      {/* Big word */}
      <div className="relative mt-auto flex flex-col items-center px-3 pb-4 md:px-8 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={`idx-${category.slug}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-1 text-xs font-medium tracking-wide md:text-sm"
          >
            {`[${category.index}]`}
          </motion.p>
        </AnimatePresence>

        <div className="overflow-hidden px-[1vw] pb-[2.5vw] md:pb-[2.2vw]">
          <AnimatePresence mode="wait">
            <motion.h1
              key={category.slug}
              initial={{ y: "115%" }}
              animate={{ y: 0 }}
              exit={{ y: "-115%" }}
              transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
              className="text-center"
            >
              <Link
                href={`/${category.slug}`}
                data-cursor="open"
                onClick={(e) => {
                  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                  e.preventDefault()
                  navigate(`/${category.slug}`, category.name)
                }}
                className="block text-[19vw] leading-none font-extrabold tracking-tighter lowercase transition-opacity hover:opacity-80 md:text-[16.5vw]"
              >
                {category.name}
              </Link>
            </motion.h1>
          </AnimatePresence>
        </div>

        <span className="absolute bottom-5 left-3 md:bottom-8 md:left-8">
          <SignatureMark tone="light" layout="corner" />
        </span>
        <div className="absolute right-3 bottom-5 flex items-baseline md:right-8 md:bottom-8">
          <SiteMenu collections={categories} onOpenChange={setMenuOpen} />
        </div>
      </div>
    </main>
  )
}

function Thumb({
  src,
  alt,
  delay,
  className = "",
}: {
  src: string
  alt: string
  delay: number
  className?: string
}) {
  return (
    <div
      className={`relative aspect-square w-[20%] shrink-0 overflow-hidden bg-black sm:w-[14%] md:w-[11%] ${className}`}
    >
      <AnimatePresence mode="popLayout">
        <motion.div
          key={src}
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, delay, ease: [0.32, 0.72, 0, 1] }}
          className="absolute inset-0"
        >
          <Image
            src={src || "/placeholder.svg"}
            alt={alt}
            fill
            sizes="(max-width: 768px) 20vw, 11vw"
            className="object-cover"
          />
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
