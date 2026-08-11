"use client"

import Link from "next/link"
import { motion } from "framer-motion"

import type { GearContentData } from "@/lib/content"
import { SignatureMark } from "@/components/signature-mark"
import { SiteMenu, type MenuCollection } from "@/components/site-menu"

const ease = [0.32, 0.72, 0, 1] as const

export function GearContent({
  gear,
  collections,
}: {
  gear: GearContentData
  collections: MenuCollection[]
}) {
  return (
    <main className="px-4 py-6 md:px-10 md:py-10">
      <header className="flex items-start justify-between">
        <Link
          href="/"
          className="text-xs font-bold tracking-widest transition-opacity hover:opacity-50 md:text-sm"
        >
          {"[ ← INDEX ]"}
        </Link>
        <div className="flex items-baseline gap-4 md:gap-6">
          <span className="text-xs font-medium tracking-wide md:text-sm">
            {`[${gear.year}]`}
          </span>
          <SiteMenu collections={collections} />
        </div>
      </header>

      {/* The mask needs room for the descender on `g`, or the reveal clips it. */}
      <div className="mt-10 overflow-hidden px-[0.08em] pb-[0.25em] md:mt-16">
        <motion.h1
          initial={{ y: "130%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="text-6xl leading-none font-extrabold tracking-tighter lowercase md:text-9xl"
        >
          gear
        </motion.h1>
      </div>

      <motion.p
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25, ease }}
        className="mt-8 max-w-md text-sm leading-relaxed text-pretty text-muted-foreground md:mt-12 md:text-base"
      >
        {gear.intro}
      </motion.p>

      <div className="mt-12 flex flex-col gap-12 md:mt-20 md:gap-16">
        {gear.groups.map((group, groupIndex) => (
          <motion.section
            key={groupIndex}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.6, delay: 0.05 * groupIndex, ease }}
            className="grid grid-cols-1 gap-6 md:grid-cols-5 md:gap-12"
          >
            <h2 className="text-xs font-bold tracking-widest uppercase md:col-span-1">
              {group.title}
            </h2>

            <ul className="flex flex-col md:col-span-4">
              {group.items.map((item, itemIndex) => (
                <li
                  key={itemIndex}
                  className="flex flex-col gap-1 border-t border-foreground/15 py-5 md:flex-row md:items-baseline md:justify-between md:gap-12"
                >
                  <p className="text-base font-medium md:w-1/3 md:text-lg">
                    {item.name}
                  </p>
                  <p className="text-sm leading-relaxed text-pretty text-muted-foreground md:flex-1">
                    {item.note}
                  </p>
                  <span className="text-[10px] font-medium tracking-widest text-muted-foreground md:text-xs">
                    {`[${item.year}]`}
                  </span>
                </li>
              ))}
            </ul>
          </motion.section>
        ))}
      </div>

      <footer className="mt-16 flex items-center md:mt-24">
        <SignatureMark tone="light" />
      </footer>
    </main>
  )
}
