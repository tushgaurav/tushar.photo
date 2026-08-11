import { asc, eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { CONTENT_TAG, categoryTag } from "../cache-tags"
import type { Category, Photo, SubcollectionSummary } from "../content"
import { photoUrl } from "../images"
import { db } from "../db"
import { categories, photos } from "../db/schema"
import type { CategoryRow, PhotoRow } from "../db/schema"

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    src: photoUrl(row.storageKey, { width: 2000 }),
    ogSrc: photoUrl(row.storageKey, {
      width: 1200,
      format: "jpeg",
      grayscale: true,
    }),
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

type RowWithPhotos = CategoryRow & { photos: PhotoRow[] }

/** The home filmstrip renders one center photo plus six thumbnails. */
const HERO_PHOTO_COUNT = 7

function toHeroPhotos(ownPhotos: Photo[], childRows: RowWithPhotos[]): Photo[] {
  const pool =
    ownPhotos.length > 0
      ? ownPhotos
      : childRows.flatMap((child) => child.photos.map(toPhoto))
  return pool.slice(0, HERO_PHOTO_COUNT)
}

function toCategory(
  row: RowWithPhotos,
  displayIndex: number,
  parentSlug: string | null,
  childRows: RowWithPhotos[] = [],
): Category {
  const ownPhotos = row.photos.map(toPhoto)
  return {
    id: row.id,
    slug: row.slug,
    path: parentSlug ? `${parentSlug}/${row.slug}` : row.slug,
    name: row.name,
    index: displayIndex,
    year: row.year,
    intro: row.intro,
    photos: ownPhotos,
    heroPhotos: toHeroPhotos(ownPhotos, childRows),
    parentSlug,
    children: childRows.map((child) => toSummary(child, row.slug)),
  }
}

function toSummary(row: RowWithPhotos, parentSlug: string): SubcollectionSummary {
  return {
    id: row.id,
    slug: row.slug,
    path: `${parentSlug}/${row.slug}`,
    name: row.name,
    year: row.year,
    photoCount: row.photos.length,
    cover: row.photos[0] ? toPhoto(row.photos[0]) : null,
  }
}

/**
 * Every published category (top-level and sub-collections) with its published
 * photos, in display order. One grouped query; the tree is assembled in JS.
 */
async function loadPublishedRows(): Promise<RowWithPhotos[]> {
  return db.query.categories.findMany({
    where: eq(categories.published, true),
    orderBy: [asc(categories.sortIndex), asc(categories.createdAt)],
    with: {
      photos: {
        where: eq(photos.published, true),
        orderBy: [asc(photos.sortIndex), asc(photos.createdAt)],
      },
    },
  })
}

function childrenOf(rows: RowWithPhotos[], parent: RowWithPhotos) {
  return rows.filter((row) => row.parentId === parent.id)
}

/**
 * Every published top-level collection, each carrying summaries of its
 * sub-collections. The home page needs all of them at once for its filmstrip.
 */
export async function getCategories(): Promise<Category[]> {
  "use cache"
  cacheTag(CONTENT_TAG)
  cacheLife("max")

  const rows = await loadPublishedRows()
  const topLevel = rows.filter((row) => row.parentId === null)

  return topLevel.map((row, i) =>
    toCategory(row, i + 1, null, childrenOf(rows, row)),
  )
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
 * A sub-collection addressed as `/parentSlug/childSlug`, with its parent and
 * its siblings resolved in one pass so the page can render breadcrumb and
 * prev/next without further lookups.
 */
export async function getSubcollection(
  parentSlug: string,
  childSlug: string,
): Promise<{
  category: Category
  parent: Category
  prev: Category | null
  next: Category | null
  siblingCount: number
} | null> {
  "use cache"
  cacheTag(CONTENT_TAG, categoryTag(childSlug))
  cacheLife("max")

  const rows = await loadPublishedRows()
  const parentRow = rows.find(
    (row) => row.slug === parentSlug && row.parentId === null,
  )
  if (!parentRow) return null

  const siblings = childrenOf(rows, parentRow).map((row, i) =>
    toCategory(row, i + 1, parentSlug),
  )

  const index = siblings.findIndex((sibling) => sibling.slug === childSlug)
  if (index === -1) return null

  const parent = await getCategory(parentSlug)
  if (!parent) return null

  const wrap = siblings.length >= 2
  return {
    category: siblings[index],
    parent,
    prev: wrap ? siblings[(index - 1 + siblings.length) % siblings.length] : null,
    next: wrap ? siblings[(index + 1) % siblings.length] : null,
    siblingCount: siblings.length,
  }
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

/** Top-level slugs for `generateStaticParams`. */
export async function getCategorySlugs(): Promise<string[]> {
  "use cache"
  cacheTag(CONTENT_TAG)
  cacheLife("max")

  const rows = await loadPublishedRows()
  return rows.filter((row) => row.parentId === null).map((row) => row.slug)
}

/** `{ category, subcategory }` pairs for `generateStaticParams`. */
export async function getSubcollectionParams(): Promise<
  { category: string; subcategory: string }[]
> {
  "use cache"
  cacheTag(CONTENT_TAG)
  cacheLife("max")

  const rows = await loadPublishedRows()
  const slugById = new Map(rows.map((row) => [row.id, row.slug]))

  return rows.flatMap((row) => {
    if (!row.parentId) return []
    const parentSlug = slugById.get(row.parentId)
    return parentSlug ? [{ category: parentSlug, subcategory: row.slug }] : []
  })
}
