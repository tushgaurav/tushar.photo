/**
 * Canonical shapes for rendered content.
 *
 * These are the view models the public components consume. They deliberately do
 * not mirror the database rows one-to-one: `src` and `blurDataUrl` are derived
 * from the stored Cloudinary public ID, and `index` is a 1-based display
 * position derived from ordering rather than a stored column.
 */

export type PhotoLayout = "left" | "right" | "full"

export type Photo = {
  id: string
  /** Cloudinary delivery URL. */
  src: string
  /** Tiny blurred variant for use as a `blurDataURL` placeholder. */
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
