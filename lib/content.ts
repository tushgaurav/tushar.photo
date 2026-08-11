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
   * Grayscale JPEG for Open Graph previews. The site's monochrome look is a
   * CSS filter, which social crawlers don't run, so it is baked in here.
   */
  ogSrc: string
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

/**
 * Card-sized summary of a sub-collection, used on the parent's index page and
 * for the home filmstrip fallback when a parent has no photos of its own.
 */
export type SubcollectionSummary = {
  id: string
  slug: string
  /** Route path without leading slash, e.g. `events/wedding-goa-2026`. */
  path: string
  name: string
  year: string
  photoCount: number
  /** First published photo, or null for an empty sub-collection. */
  cover: Photo | null
}

export type Category = {
  id: string
  slug: string
  /**
   * Route path without leading slash: equal to `slug` for top-level
   * collections, `parentSlug/slug` for sub-collections.
   */
  path: string
  name: string
  /**
   * 1-based display position, shown as `01/04` in the gallery footer.
   * For sub-collections this is the position among siblings.
   */
  index: number
  year: string
  intro: string
  photos: Photo[]
  /**
   * What the home filmstrip shows: the category's own photos, or — when it
   * only holds sub-collections — the sub-collections' photos. Capped at the
   * seven slots the filmstrip renders (one center, three per side).
   */
  heroPhotos: Photo[]
  /** Slug of the parent collection, null for top-level collections. */
  parentSlug: string | null
  /** Published sub-collections in display order. Empty for sub-collections. */
  children: SubcollectionSummary[]
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
