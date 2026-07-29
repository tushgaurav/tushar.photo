"use server"

import { and, asc, eq, gt, max, ne, sql } from "drizzle-orm"
import { revalidateTag, updateTag } from "next/cache"
import { redirect } from "next/navigation"

import { ABOUT_TAG, CONTENT_TAG, categoryTag } from "@/lib/cache-tags"
import { requireAdmin } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { aboutPage, categories, photos } from "@/lib/db/schema"
import {
  aboutSchema,
  categorySchema,
  emptyToNull,
  photoSchema,
  reorderSchema,
  uploadedPhotoSchema,
} from "@/lib/validation"

/**
 * Every action starts with requireAdmin(). Server actions are reachable as
 * ordinary HTTP POSTs, so the proxy's cookie check is not sufficient — a caller
 * who skips the UI entirely still has to get past this.
 */

export type ActionResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: Record<string, string[]> }

/**
 * `updateTag` rather than `revalidateTag`: it expires immediately, so the editor
 * sees their own change on the next render instead of a stale-while-revalidate
 * copy of the previous content.
 */
function invalidateContent(slug?: string) {
  updateTag(CONTENT_TAG)
  if (slug) updateTag(categoryTag(slug))
}

function fieldErrorsOf(error: {
  issues: { path: (string | number | symbol)[]; message: string }[]
}): Record<string, string[]> {
  const result: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "_")
    result[key] ??= []
    result[key].push(issue.message)
  }
  return result
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function createCategory(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()

  const parsed = categorySchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    year: formData.get("year"),
    intro: formData.get("intro") ?? "",
    published: formData.get("published") === "on",
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    }
  }

  const duplicate = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, parsed.data.slug))
    .limit(1)

  if (duplicate.length > 0) {
    return {
      ok: false,
      error: "That slug is already taken.",
      fieldErrors: { slug: ["Already in use"] },
    }
  }

  // Append to the end rather than defaulting to 0, which would tie with every
  // other new category and leave ordering to the createdAt fallback.
  const [{ value: currentMax }] = await db
    .select({ value: max(categories.sortIndex) })
    .from(categories)

  const [created] = await db
    .insert(categories)
    .values({ ...parsed.data, sortIndex: (currentMax ?? -1) + 1 })
    .returning({ id: categories.id })

  invalidateContent(parsed.data.slug)
  redirect(`/admin/categories/${created.id}`)
}

export async function updateCategory(
  categoryId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()

  const parsed = categorySchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    year: formData.get("year"),
    intro: formData.get("intro") ?? "",
    published: formData.get("published") === "on",
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    }
  }

  const [existing] = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)

  if (!existing) return { ok: false, error: "Category not found." }

  const duplicate = await db
    .select({ id: categories.id })
    .from(categories)
    .where(
      and(eq(categories.slug, parsed.data.slug), ne(categories.id, categoryId)),
    )
    .limit(1)

  if (duplicate.length > 0) {
    return {
      ok: false,
      error: "That slug is already taken.",
      fieldErrors: { slug: ["Already in use"] },
    }
  }

  await db
    .update(categories)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(categories.id, categoryId))

  // Invalidate both slugs when it changed, or the old URL keeps serving.
  invalidateContent(parsed.data.slug)
  if (existing.slug !== parsed.data.slug) {
    updateTag(categoryTag(existing.slug))
  }

  return { ok: true }
}

export async function deleteCategory(categoryId: string): Promise<never> {
  await requireAdmin()

  const [existing] = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)

  // Photo rows cascade. The Cloudinary assets are intentionally left in place;
  // deleting them here would make an accidental category deletion
  // unrecoverable.
  await db.delete(categories).where(eq(categories.id, categoryId))

  if (existing) invalidateContent(existing.slug)
  redirect("/admin/categories")
}

export async function reorderCategories(ids: string[]): Promise<ActionResult> {
  await requireAdmin()

  const parsed = reorderSchema.safeParse({ ids })
  if (!parsed.success) return { ok: false, error: "Invalid ordering." }

  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx
        .update(categories)
        .set({ sortIndex: index, updatedAt: new Date() })
        .where(eq(categories.id, id))
    }
  })

  invalidateContent()
  return { ok: true }
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

/** Called by the upload widget's success handler, once per uploaded file. */
export async function attachUploadedPhoto(input: {
  categoryId: string
  cloudinaryPublicId: string
  width: number
  height: number
}): Promise<ActionResult & { photoId?: string }> {
  await requireAdmin()

  const parsed = uploadedPhotoSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: "Invalid upload payload." }

  const [category] = await db
    .select({ id: categories.id, slug: categories.slug, year: categories.year })
    .from(categories)
    .where(eq(categories.id, parsed.data.categoryId))
    .limit(1)

  if (!category) return { ok: false, error: "Category not found." }

  const [{ value: currentMax }] = await db
    .select({ value: max(photos.sortIndex) })
    .from(photos)
    .where(eq(photos.categoryId, category.id))

  const [created] = await db
    .insert(photos)
    .values({
      categoryId: category.id,
      cloudinaryPublicId: parsed.data.cloudinaryPublicId,
      width: parsed.data.width,
      height: parsed.data.height,
      // Alt text is required for the public site but cannot be known at upload
      // time. Start unpublished so a photo can never reach visitors without a
      // description having been written for it.
      alt: "",
      year: category.year,
      layout: "full",
      sortIndex: (currentMax ?? -1) + 1,
      published: false,
    })
    .returning({ id: photos.id })

  invalidateContent(category.slug)
  return { ok: true, photoId: created.id }
}

export async function updatePhoto(
  photoId: string,
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()

  const parsed = photoSchema.safeParse({
    alt: formData.get("alt"),
    caption: formData.get("caption") ?? "",
    location: formData.get("location") ?? "",
    year: formData.get("year"),
    layout: formData.get("layout"),
    camera: formData.get("camera") ?? "",
    lens: formData.get("lens") ?? "",
    settings: formData.get("settings") ?? "",
    published: formData.get("published") === "on",
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    }
  }

  const [existing] = await db
    .select({ categoryId: photos.categoryId })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1)

  if (!existing) return { ok: false, error: "Photo not found." }

  await db
    .update(photos)
    .set({
      alt: parsed.data.alt,
      caption: emptyToNull(parsed.data.caption),
      location: emptyToNull(parsed.data.location),
      year: parsed.data.year,
      layout: parsed.data.layout,
      camera: parsed.data.camera,
      lens: parsed.data.lens,
      settings: parsed.data.settings,
      published: parsed.data.published,
      updatedAt: new Date(),
    })
    .where(eq(photos.id, photoId))

  const slug = await slugForCategory(existing.categoryId)
  invalidateContent(slug)

  return { ok: true }
}

export async function setPhotoPublished(
  photoId: string,
  published: boolean,
): Promise<ActionResult> {
  await requireAdmin()

  const [existing] = await db
    .select({ categoryId: photos.categoryId, alt: photos.alt })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1)

  if (!existing) return { ok: false, error: "Photo not found." }

  if (published && existing.alt.trim().length === 0) {
    return {
      ok: false,
      error: "Add alt text before publishing this photo.",
    }
  }

  await db
    .update(photos)
    .set({ published, updatedAt: new Date() })
    .where(eq(photos.id, photoId))

  invalidateContent(await slugForCategory(existing.categoryId))
  return { ok: true }
}

/**
 * Soft delete by default: unpublishing removes a photo from the site while
 * keeping the row and the Cloudinary asset, so a mistake is reversible.
 * Hard deletion is a separate, explicit action.
 */
export async function deletePhoto(photoId: string): Promise<ActionResult> {
  await requireAdmin()

  const [existing] = await db
    .select({ categoryId: photos.categoryId, sortIndex: photos.sortIndex })
    .from(photos)
    .where(eq(photos.id, photoId))
    .limit(1)

  if (!existing) return { ok: false, error: "Photo not found." }

  await db.transaction(async (tx) => {
    await tx.delete(photos).where(eq(photos.id, photoId))

    // Close the gap so sortIndex stays contiguous.
    await tx
      .update(photos)
      .set({ sortIndex: sql`${photos.sortIndex} - 1` })
      .where(
        and(
          eq(photos.categoryId, existing.categoryId),
          gt(photos.sortIndex, existing.sortIndex),
        ),
      )
  })

  invalidateContent(await slugForCategory(existing.categoryId))
  return { ok: true }
}

export async function reorderPhotos(
  categoryId: string,
  ids: string[],
): Promise<ActionResult> {
  await requireAdmin()

  const parsed = reorderSchema.safeParse({ ids })
  if (!parsed.success) return { ok: false, error: "Invalid ordering." }

  // Only reorder within the category the caller named, so a crafted request
  // cannot move another category's photos.
  const owned = await db
    .select({ id: photos.id })
    .from(photos)
    .where(eq(photos.categoryId, categoryId))
    .orderBy(asc(photos.sortIndex))

  const ownedIds = new Set(owned.map((row) => row.id))
  if (
    parsed.data.ids.length !== ownedIds.size ||
    parsed.data.ids.some((id) => !ownedIds.has(id))
  ) {
    return { ok: false, error: "Ordering does not match this category." }
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of parsed.data.ids.entries()) {
      await tx
        .update(photos)
        .set({ sortIndex: index, updatedAt: new Date() })
        .where(eq(photos.id, id))
    }
  })

  invalidateContent(await slugForCategory(categoryId))
  return { ok: true }
}

// ---------------------------------------------------------------------------
// About page
// ---------------------------------------------------------------------------

export async function updateAbout(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()

  const heroPhotoId = formData.get("heroPhotoId")

  const parsed = aboutSchema.safeParse({
    year: formData.get("year"),
    // Paragraphs arrive as one textarea, split on blank lines. Blank entries are
    // dropped so trailing newlines do not become empty <p> tags.
    paragraphs: String(formData.get("paragraphs") ?? "")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
    links: parseLinks(formData),
    heroPhotoId:
      typeof heroPhotoId === "string" && heroPhotoId.length > 0
        ? heroPhotoId
        : null,
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    }
  }

  const [existing] = await db
    .select({ id: aboutPage.id })
    .from(aboutPage)
    .limit(1)

  if (existing) {
    await db
      .update(aboutPage)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(aboutPage.id, existing.id))
  } else {
    await db.insert(aboutPage).values(parsed.data)
  }

  updateTag(ABOUT_TAG)
  return { ok: true }
}

/** Reads the repeated `linkLabel` / `linkHref` pairs the form submits. */
function parseLinks(formData: FormData) {
  const labels = formData.getAll("linkLabel").map(String)
  const hrefs = formData.getAll("linkHref").map(String)

  return labels
    .map((label, i) => ({ label: label.trim(), href: (hrefs[i] ?? "").trim() }))
    .filter((link) => link.label.length > 0 || link.href.length > 0)
}

// ---------------------------------------------------------------------------

async function slugForCategory(categoryId: string): Promise<string | undefined> {
  const [row] = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)
  return row?.slug
}

/**
 * Forces a full content refresh. Exposed for the "rebuild" button, for the case
 * where something was changed directly in the database.
 */
export async function revalidateEverything(): Promise<ActionResult> {
  await requireAdmin()
  revalidateTag(CONTENT_TAG, "max")
  revalidateTag(ABOUT_TAG, "max")
  return { ok: true }
}
