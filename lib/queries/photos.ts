import { asc, eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { CONTENT_TAG, categoryTag } from "../cache-tags"
import type { Category, Photo } from "../content"
import { photoUrl } from "../images"
import { db } from "../db"
import { categories, photos } from "../db/schema"
import type { CategoryRow, PhotoRow } from "../db/schema"

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    src: photoUrl(row.storageKey, { width: 2000 }),
    blurDataUrl: row.blurDataUrl,
    width: row.width,
    height: row.height,
    alt: row.alt,
    caption: row.caption ?? undefined,
    location: row.location ?? undefined,
    year: row.year,
    layout: row.layout,
    camera: row.camera,
    lens: row.lens,
    settings: row.settings,
  }
}

function toCategory(
  row: CategoryRow,
  photoRows: PhotoRow[],
  displayIndex: number,
): Category {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    index: displayIndex,
    year: row.year,
    intro: row.intro,
    photos: photoRows.map(toPhoto),
  }
}

/**
 * Every published category with its published photos, in display order.
 *
 * Fetched as a single grouped query rather than per-category, because the home
 * page needs all of them at once to build its filmstrip.
 */
export async function getCategories(): Promise<Category[]> {
  "use cache"
  cacheTag(CONTENT_TAG)
  cacheLife("max")

  const rows = await db.query.categories.findMany({
    where: eq(categories.published, true),
    orderBy: [asc(categories.sortIndex), asc(categories.createdAt)],
    with: {
      photos: {
        where: eq(photos.published, true),
        orderBy: [asc(photos.sortIndex), asc(photos.createdAt)],
      },
    },
  })

  return rows.map((row, i) => toCategory(row, row.photos, i + 1))
}

export async function getCategory(slug: string): Promise<Category | null> {
  "use cache"
  cacheTag(CONTENT_TAG, categoryTag(slug))
  cacheLife("max")

  // Read through the full list so `index` stays consistent with the ordering
  // shown elsewhere. A standalone lookup could not know its own position.
  const all = await getCategories()
  return all.find((category) => category.slug === slug) ?? null
}

/**
 * Neighbours for the gallery footer, wrapping at both ends.
 * Returns null when there are fewer than two categories, since prev/next links
 * pointing at the current page would be meaningless.
 */
export async function getAdjacentCategories(
  slug: string,
): Promise<{ prev: Category; next: Category } | null> {
  "use cache"
  cacheTag(CONTENT_TAG)
  cacheLife("max")

  const all = await getCategories()
  if (all.length < 2) return null

  const i = all.findIndex((category) => category.slug === slug)
  if (i === -1) return null

  return {
    prev: all[(i - 1 + all.length) % all.length],
    next: all[(i + 1) % all.length],
  }
}

/** Slugs for `generateStaticParams`. */
export async function getCategorySlugs(): Promise<string[]> {
  "use cache"
  cacheTag(CONTENT_TAG)
  cacheLife("max")

  const rows = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.published, true))
    .orderBy(asc(categories.sortIndex))

  return rows.map((row) => row.slug)
}
