/**
 * Canonical shapes for rendered content.
 *
 * These are the view models the public components consume. They deliberately do
 * not mirror the database rows one-to-one: `src` is derived from the stored R2
 * object key, and `index` is a 1-based display position derived from ordering
 * rather than a stored column.
 */

import type { GearGroup } from "./db/schema"

export type PhotoLayout = "left" | "right" | "full"

export type Photo = {
  id: string
  /** Cloudflare transformation URL. */
  src: string
  /**
   * A 16px WebP inlined as a data URL, intended as a `blurDataURL` placeholder.
   * Carried through but not currently rendered by any component.
   */
  blurDataUrl: string
  width: number
  height: number
  alt: string
  caption?: string
  location?: string
  year: string
  layout: PhotoLayout
  camera: string
  lens: string
  settings: string
}

export type Category = {
  id: string
  slug: string
  name: string
  /** 1-based display position, shown as `01/04` in the gallery footer. */
  index: number
  year: string
  intro: string
  photos: Photo[]
}

export type GearContentData = {
  year: string
  intro: string
  groups: GearGroup[]
}

export type AboutContentData = {
  year: string
  paragraphs: string[]
  links: { label: string; href: string }[]
  hero: {
    src: string
    blurDataUrl: string
    alt: string
  } | null
}
