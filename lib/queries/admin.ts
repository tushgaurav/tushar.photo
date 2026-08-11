import { asc, count, eq } from "drizzle-orm"

import { photoUrl } from "../images"
import { db } from "../db"
import { aboutPage, categories, gearPage, photos } from "../db/schema"
import type { PhotoRow } from "../db/schema"

/**
 * Reads for the admin area.
 *
 * Deliberately uncached, and deliberately not filtered by `published`: the whole
 * point of the admin is to see and edit drafts. Reusing the cached public
 * queries here would show stale data straight after a save.
 */

export type AdminPhoto = {
  id: string
  storageKey: string
  thumbUrl: string
  /** Wider transform for the arrange board, where rows render near full width. */
  previewUrl: string
  blurDataUrl: string
  width: number
  height: number
  alt: string
  caption: string | null
  location: string | null
  year: string
  layout: "left" | "right" | "full"
  camera: string
  lens: string
  settings: string
  sortIndex: number
  published: boolean
}

export type AdminCategory = {
  id: string
  slug: string
  name: string
  parentId: string | null
  sortIndex: number
  year: string
  intro: string
  published: boolean
  photoCount: number
}

function toAdminPhoto(row: PhotoRow): AdminPhoto {
  return {
    id: row.id,
    storageKey: row.storageKey,
    thumbUrl: photoUrl(row.storageKey, { width: 400 }),
    previewUrl: photoUrl(row.storageKey, { width: 1000 }),
    blurDataUrl: row.blurDataUrl,
    width: row.width,
    height: row.height,
    alt: row.alt,
    caption: row.caption,
    location: row.location,
    year: row.year,
    layout: row.layout,
    camera: row.camera,
    lens: row.lens,
    settings: row.settings,
    sortIndex: row.sortIndex,
    published: row.published,
  }
}

export async function listCategories(): Promise<AdminCategory[]> {
  const rows = await db
    .select({
      id: categories.id,
      slug: categories.slug,
      name: categories.name,
      parentId: categories.parentId,
      sortIndex: categories.sortIndex,
      year: categories.year,
      intro: categories.intro,
      published: categories.published,
      photoCount: count(photos.id),
    })
    .from(categories)
    .leftJoin(photos, eq(photos.categoryId, categories.id))
    .groupBy(categories.id)
    .orderBy(asc(categories.sortIndex), asc(categories.createdAt))

  return rows.map((row) => ({ ...row, photoCount: Number(row.photoCount) }))
}

export async function getAdminCategory(id: string) {
  const [category] = await db
    .select()
    .from(categories)
    .where(eq(categories.id, id))
    .limit(1)

  if (!category) return null

  const photoRows = await db
    .select()
    .from(photos)
    .where(eq(photos.categoryId, id))
    .orderBy(asc(photos.sortIndex), asc(photos.createdAt))

  return {
    ...category,
    photos: photoRows.map(toAdminPhoto),
  }
}

export async function getAdminPhoto(id: string) {
  const [row] = await db.select().from(photos).where(eq(photos.id, id)).limit(1)
  if (!row) return null

  return {
    ...toAdminPhoto(row),
    categoryId: row.categoryId,
    fullUrl: photoUrl(row.storageKey, { width: 1600 }),
  }
}

export async function getAdminAbout() {
  const [row] = await db.select().from(aboutPage).limit(1)

  // Every photo, so the hero can be picked from a dropdown.
  const allPhotos = await db
    .select({
      id: photos.id,
      storageKey: photos.storageKey,
      alt: photos.alt,
      categoryName: categories.name,
    })
    .from(photos)
    .innerJoin(categories, eq(categories.id, photos.categoryId))
    .orderBy(asc(categories.sortIndex), asc(photos.sortIndex))

  return {
    about: row ?? null,
    photoOptions: allPhotos.map((photo) => ({
      id: photo.id,
      label: `${photo.categoryName} — ${photo.alt.slice(0, 60)}`,
      thumbUrl: photoUrl(photo.storageKey, { width: 200 }),
    })),
  }
}

export async function getAdminGear() {
  const [row] = await db.select().from(gearPage).limit(1)
  return row ?? null
}

export async function getAdminStats() {
  const [categoryCount] = await db.select({ value: count() }).from(categories)
  const [photoCount] = await db.select({ value: count() }).from(photos)
  const [publishedPhotoCount] = await db
    .select({ value: count() })
    .from(photos)
    .where(eq(photos.published, true))

  return {
    categories: categoryCount.value,
    photos: photoCount.value,
    publishedPhotos: publishedPhotoCount.value,
  }
}
