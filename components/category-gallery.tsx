"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { motion, useScroll, useTransform } from "framer-motion"
import type { Category, Photo } from "@/lib/photos"
import { Lightbox } from "@/components/lightbox"
import { TransitionLink } from "@/components/page-transition"

const ease = [0.32, 0.72, 0, 1] as const

function Reveal({
  children,
  delay = 0,
  className = "",
}: {
  children: React.ReactNode
  delay?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.7, delay, ease }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

function ParallaxImage({
  photo,
  aspect,
  sizes,
  onOpen,
  priority = false,
}: {
  photo: Photo
  aspect: string
  sizes: string
  onOpen: () => void
  priority?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  })
  // Image moves slightly slower than scroll for depth
  const y = useTransform(scrollYProgress, [0, 1], ["-6%", "6%"])

  return (
    <div ref={ref} className={`relative w-full overflow-hidden bg-black ${aspect}`}>
      <button
        type="button"
        onClick={onOpen}
        data-cursor="view"
        aria-label={`View ${photo.alt} fullscreen`}
        className="group absolute inset-0 z-10"
      >
        <motion.div style={{ y }} className="absolute -inset-y-[8%] inset-x-0">
          <Image
            src={photo.src || "/placeholder.svg"}
            alt={photo.alt}
            fill
            sizes={sizes}
            priority={priority}
            className="object-cover grayscale transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />
        </motion.div>
      </button>
    </div>
  )
}

function ExifStrip({ photo, align = "left" }: { photo: Photo; align?: "left" | "right" }) {
  return (
    <div
      className={`flex gap-4 text-[10px] font-medium tracking-widest text-muted-foreground ${
        align === "right" ? "md:justify-end" : ""
      }`}
    >
      <span>{photo.camera}</span>
      <span>{photo.settings}</span>
    </div>
  )
}

function EditorialRow({
  photo,
  index,
  onOpen,
}: {
  photo: Photo
  index: number
  onOpen: () => void
}) {
  if (photo.layout === "full") {
    return (
      <Reveal>
        <figure>
          <ParallaxImage
            photo={photo}
            aspect="aspect-[16/9] md:aspect-[2/1]"
            sizes="100vw"
            onOpen={onOpen}
            priority={index === 0}
          />
          <figcaption className="mt-3">
            <ExifStrip photo={photo} />
          </figcaption>
        </figure>
      </Reveal>
    )
  }

  const imageFirst = photo.layout === "left"

  const meta = (
    <div
      className={`flex h-full flex-col justify-between gap-8 py-2 md:py-0 ${
        imageFirst ? "md:items-start" : "md:items-end md:text-right"
      }`}
    >
      <div className={`flex w-full ${imageFirst ? "justify-end" : "justify-start"}`}>
        <Reveal delay={0.1}>
          <span className="text-xs font-medium tracking-wide">{`[${photo.year}]`}</span>
        </Reveal>
      </div>

      <Reveal delay={0.15} className="hidden md:block">
        <span className="text-sm font-medium" aria-hidden="true">
          {"[ ↓ ]"}
        </span>
      </Reveal>

      <Reveal delay={0.2}>
        <div className={`max-w-sm ${imageFirst ? "" : "md:ml-auto"}`}>
          <p className="mb-3 text-xs font-medium tracking-wide">
            {`[${index + 1}]`}
          </p>
          {photo.caption ? (
            <p className="text-sm leading-relaxed text-pretty text-muted-foreground">
              {photo.caption}
            </p>
          ) : null}
          {photo.location ? (
            <p className="mt-3 text-xs font-bold tracking-widest uppercase">
              {photo.location}
            </p>
          ) : null}
          <div className="mt-4">
            <ExifStrip photo={photo} align={imageFirst ? "left" : "right"} />
          </div>
        </div>
      </Reveal>
    </div>
  )

  const image = (
    <Reveal>
      <ParallaxImage
        photo={photo}
        aspect="aspect-[4/5]"
        sizes="(max-width: 768px) 100vw, 60vw"
        onOpen={onOpen}
        priority={index === 0}
      />
    </Reveal>
  )

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-12">
      {imageFirst ? (
        <>
          <div className="md:col-span-3">{image}</div>
          <div className="md:col-span-2">{meta}</div>
        </>
      ) : (
        <>
          <div className="order-2 md:order-1 md:col-span-2">{meta}</div>
          <div className="order-1 md:order-2 md:col-span-3">{image}</div>
        </>
      )}
    </div>
  )
}

export function CategoryGallery({
  category,
  prev,
  next,
}: {
  category: Category
  prev: Category
  next: Category
}) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null)

  return (
    <main className="px-4 py-6 md:px-10 md:py-10">
      {/* Header */}
      <header className="mb-12 md:mb-20">
        <div className="flex items-start justify-between">
          <TransitionLink
            href="/"
            className="text-xs font-bold tracking-widest transition-opacity hover:opacity-50 md:text-sm"
          >
            {"[ ← INDEX ]"}
          </TransitionLink>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-xs font-medium tracking-wide md:text-sm"
          >
            {`[${category.year}]`}
          </motion.span>
        </div>

        <div className="mt-8 flex flex-col gap-6 md:mt-12 md:flex-row md:items-end md:justify-between md:gap-12">
          <div className="overflow-hidden pb-[0.12em]">
            <motion.h1
              initial={{ y: "115%" }}
              animate={{ y: 0 }}
              transition={{ duration: 0.7, ease }}
              className="text-7xl leading-none font-extrabold tracking-tighter lowercase md:text-9xl"
            >
              {category.name}
            </motion.h1>
          </div>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease }}
            className="max-w-md text-sm leading-relaxed text-pretty text-muted-foreground"
          >
            {category.intro}
          </motion.p>
        </div>
      </header>

      {/* Photos */}
      <div className="flex flex-col gap-16 md:gap-28">
        {category.photos.map((photo, i) => (
          <EditorialRow
            key={photo.src}
            photo={photo}
            index={i}
            onOpen={() => setLightboxIndex(i)}
          />
        ))}
      </div>

      {/* Footer nav */}
      <footer className="mt-16 flex items-center justify-between md:mt-24">
        <span className="text-xs font-bold tracking-widest md:text-sm">
          {`0${category.index}/0${4}`}
        </span>
        <nav className="flex items-center gap-2 text-xs font-bold tracking-widest md:text-sm">
          <TransitionLink
            href={`/${next.slug}`}
            label={next.name}
            data-cursor="next"
            className="transition-opacity hover:opacity-50"
          >
            NEXT
          </TransitionLink>
          <span aria-hidden="true">/</span>
          <TransitionLink
            href={`/${prev.slug}`}
            label={prev.name}
            data-cursor="prev"
            className="transition-opacity hover:opacity-50"
          >
            PREV
          </TransitionLink>
        </nav>
      </footer>

      <Lightbox
        photos={category.photos}
        openIndex={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onNavigate={setLightboxIndex}
        categoryName={category.name}
      />
    </main>
  )
}
