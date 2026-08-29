"use client"

import Image from "next/image"
import { motion } from "framer-motion"

import type { SubcollectionSummary } from "@/lib/content"
import { TransitionLink } from "@/components/page-transition"

const ease = [0.32, 0.72, 0, 1] as const

/**
 * Card grid shown on a parent collection's page, one card per sub-collection
 * (e.g. one per covered event). Cards link to `/parent/child`.
 */
export function SubcollectionGrid({
  subcollections,
}: {
  subcollections: SubcollectionSummary[]
}) {
  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
      {subcollections.map((subcollection, i) => (
        <motion.div
          key={subcollection.id}
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.7, delay: (i % 3) * 0.08, ease }}
        >
          <TransitionLink
            href={`/${subcollection.path}`}
            label={subcollection.name}
            data-cursor="view"
            className="group block"
          >
            <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
              {subcollection.cover ? (
                <Image
                  src={subcollection.cover.src || "/placeholder.svg"}
                  alt={subcollection.cover.alt}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, (max-width: 1280px) 33vw, 400px"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                />
              ) : null}
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-4">
              <h2 className="text-2xl leading-none font-extrabold tracking-tighter lowercase md:text-3xl">
                {subcollection.name}
              </h2>
              <span className="text-xs font-medium tracking-wide">
                {`[${subcollection.year}]`}
              </span>
            </div>
            <p className="mt-2 text-[10px] font-bold tracking-widest uppercase text-muted-foreground">
              {subcollection.photoCount}{" "}
              {subcollection.photoCount === 1 ? "photo" : "photos"}
            </p>
          </TransitionLink>
        </motion.div>
      ))}
    </div>
  )
}
