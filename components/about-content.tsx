"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

import type { AboutContentData } from "@/lib/content"
import { SignatureMark } from "@/components/signature-mark"
import { SiteMenu, type MenuCollection } from "@/components/site-menu"

const ease = [0.32, 0.72, 0, 1] as const

export function AboutContent({
  about,
  collections,
}: {
  about: AboutContentData | null
  collections: MenuCollection[]
}) {
  const paragraphs = about?.paragraphs ?? []
  const links = about?.links ?? []
  const year = about?.year ?? "2025"
  const hero = about?.hero ?? null

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 md:px-10 md:py-10">
      <header className="flex items-start justify-between">
        <Link
          href="/"
          className="text-xs font-bold tracking-widest transition-opacity hover:opacity-50 md:text-sm"
        >
          {"[ ← INDEX ]"}
        </Link>
        <div className="flex items-baseline gap-4 md:gap-6">
          <span className="text-xs font-medium tracking-wide md:text-sm">
            {`[${year}]`}
          </span>
          <SiteMenu collections={collections} />
        </div>
      </header>

      <div className="mt-10 overflow-hidden md:mt-16">
        <motion.h1
          initial={{ y: "105%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="text-6xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-9xl"
        >
          about
        </motion.h1>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 md:mt-20 md:grid-cols-5 md:gap-12">
        {hero ? (
          <motion.figure
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2, ease }}
            className="relative aspect-[4/5] w-full overflow-hidden bg-black md:col-span-2"
          >
            <Image
              src={hero.src}
              alt={hero.alt}
              fill
              sizes="(max-width: 768px) 100vw, 40vw"
              className="object-cover"
            />
          </motion.figure>
        ) : null}

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease }}
          className={`flex flex-col justify-between gap-10 ${
            hero ? "md:col-span-3" : "md:col-span-5"
          }`}
        >
          <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground md:max-w-lg md:text-base">
            {paragraphs.map((paragraph, i) =>
              // The first paragraph is the lead, set larger and in full contrast.
              i === 0 ? (
                <p
                  key={i}
                  className="text-lg font-medium text-foreground text-pretty md:text-xl"
                >
                  {paragraph}
                </p>
              ) : (
                <p key={i}>{paragraph}</p>
              ),
            )}
          </div>

          {links.length > 0 ? (
            <div className="flex flex-col gap-3">
              <p className="text-xs font-bold tracking-widest uppercase">
                Elsewhere
              </p>
              <div className="flex flex-wrap gap-6 text-sm font-bold tracking-widest">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noreferrer"
                    className="transition-opacity hover:opacity-50"
                  >
                    {`[ ${link.label} ]`}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </motion.div>
      </div>

      <footer className="mt-16 flex items-center md:mt-24">
        <SignatureMark tone="light" />
      </footer>
    </main>
  )
}
