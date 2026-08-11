"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { AnimatePresence, motion } from "framer-motion"
import type { Category } from "@/lib/content"
import { usePageTransition } from "@/components/page-transition"
import { SignatureMark } from "@/components/signature-mark"
import { SiteMenu } from "@/components/site-menu"

const ease = [0.32, 0.72, 0, 1] as const

function pad(value: number): string {
  return String(value).padStart(2, "0")
}

/** Direction-aware slide for the mobile cover, so swipes feel physical. */
const coverVariants = {
  enter: (dir: number) => ({
    x: dir === 0 ? "0%" : dir > 0 ? "26%" : "-26%",
    opacity: 0,
    scale: 1.04,
  }),
  center: { x: "0%", opacity: 1, scale: 1 },
  exit: (dir: number) => ({
    x: dir === 0 ? "0%" : dir > 0 ? "-16%" : "16%",
    opacity: 0,
  }),
}

export function HomeHero({ categories }: { categories: Category[] }) {
  // Direction rides along with the index so exit/enter animations know
  // which way the mobile cover should slide.
  const [[active, direction], setPage] = useState<[number, number]>([0, 0])
  const [menuOpen, setMenuOpen] = useState(false)
  const { navigate } = usePageTransition()
  // A swipe on the mobile cover ends over the link; this keeps the
  // resulting click from navigating.
  const dragging = useRef(false)

  const paginate = useCallback(
    (dir: number) => {
      setPage(([a]) => [(a + dir + categories.length) % categories.length, dir])
    },
    [categories.length],
  )
  const goPrev = useCallback(() => paginate(-1), [paginate])
  const goNext = useCallback(() => paginate(1), [paginate])

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
      {/* Mobile top bar: signature + menu move up here so the bottom stays clean */}
      <div className="flex items-center justify-between px-4 pt-4 sm:hidden">
        <SignatureMark tone="light" layout="corner" />
        <SiteMenu collections={categories} onOpenChange={setMenuOpen} />
      </div>

      {/* Mobile: full-bleed swipeable cover */}
      <div className="relative mt-4 flex-1 overflow-hidden bg-black sm:hidden">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={category.slug}
            custom={direction}
            variants={coverVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.5, ease }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.15}
            dragMomentum={false}
            onDragStart={() => {
              dragging.current = true
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -56 || info.velocity.x < -450) goNext()
              else if (info.offset.x > 56 || info.velocity.x > 450) goPrev()
              // The click lands right after the drag ends; release the guard late
              window.setTimeout(() => {
                dragging.current = false
              }, 120)
            }}
            className="absolute inset-0"
          >
            <Link
              href={`/${category.slug}`}
              draggable={false}
              onClick={(e) => {
                if (dragging.current) {
                  e.preventDefault()
                  return
                }
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
                e.preventDefault()
                navigate(`/${category.slug}`, category.name)
              }}
              className="absolute inset-0"
            >
              <Image
                src={centerPhoto.src || "/placeholder.svg"}
                alt={centerPhoto.alt}
                fill
                priority
                sizes="100vw"
                draggable={false}
                className="object-cover"
              />
              <span className="sr-only">{`View ${category.name} collection`}</span>
            </Link>
          </motion.div>
        </AnimatePresence>

        {/* Scrims for chrome legibility over any photo */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/50 to-transparent"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent"
        />

        <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between p-4 text-[11px] tracking-widest text-white">
          <span className="font-bold">
            {`[${pad(active + 1)}/${pad(categories.length)}]`}
          </span>
          <span className="font-medium">{`[${category.year}]`}</span>
        </div>

        <div className="absolute inset-x-0 bottom-0 flex items-center justify-between p-4 text-white">
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous collection"
            className="-m-3 p-3 text-[11px] font-bold tracking-widest"
          >
            {"[ PREV ]"}
          </button>
          <div aria-hidden="true" className="flex items-center gap-1.5">
            {categories.map((c, i) => (
              <span
                key={c.slug}
                className={`h-0.5 w-4 transition-colors duration-300 ${
                  i === active ? "bg-white" : "bg-white/35"
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={goNext}
            aria-label="Next collection"
            className="-m-3 p-3 text-[11px] font-bold tracking-widest"
          >
            {"[ NEXT ]"}
          </button>
        </div>
      </div>

      {/* Filmstrip (tablet and up) */}
      <div className="hidden items-start justify-center gap-2 px-3 pt-3 sm:flex md:gap-5 md:px-8 md:pt-8">
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

      {/* Big word */}
      <div className="relative mt-auto flex flex-col items-center px-3 pt-3 pb-4 sm:pt-0 md:px-8 md:pb-6">
        <AnimatePresence mode="wait">
          <motion.p
            key={`idx-${category.slug}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="mb-1 hidden text-xs font-medium tracking-wide sm:block md:text-sm"
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

        <span className="absolute bottom-5 left-3 hidden sm:block md:bottom-8 md:left-8">
          <SignatureMark tone="light" layout="corner" />
        </span>
        <div className="absolute right-3 bottom-5 hidden items-baseline sm:flex md:right-8 md:bottom-8">
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
