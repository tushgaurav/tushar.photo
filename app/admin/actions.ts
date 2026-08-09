"use server"

import { and, asc, eq, gt, max, ne, sql } from "drizzle-orm"
import { revalidateTag, updateTag } from "next/cache"
import { redirect } from "next/navigation"

import { ABOUT_TAG, CONTENT_TAG, GEAR_TAG, categoryTag } from "@/lib/cache-tags"
import { requireAdmin } from "@/lib/auth-guard"
import { db } from "@/lib/db"
import { aboutPage, categories, gearPage, photos } from "@/lib/db/schema"
import { inspectUploadedImage } from "@/lib/image-metadata"
import { deleteObject } from "@/lib/r2"
import {
  aboutSchema,
  categorySchema,
  emptyToNull,
  gearSchema,
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

/**
 * Nesting is one level deep: a parent must itself be top-level. Returns an
 * error string, or null when the assignment is valid.
 */
async function validateParent(
  parentId: string | null,
  categoryId?: string,
): Promise<string | null> {
  if (!parentId) return null

  if (categoryId && parentId === categoryId) {
    return "A collection cannot be its own parent."
  }

  const [parent] = await db
    .select({ parentId: categories.parentId })
    .from(categories)
    .where(eq(categories.id, parentId))
    .limit(1)

  if (!parent) return "Parent collection not found."
  if (parent.parentId) {
    return "Sub-collections cannot contain their own sub-collections."
  }

  if (categoryId) {
    const [child] = await db
      .select({ id: categories.id })
      .from(categories)
      .where(eq(categories.parentId, categoryId))
      .limit(1)

    if (child) {
      return "This collection has sub-collections, so it must stay top-level."
    }
  }

  return null
}

function parentIdFromForm(formData: FormData): string | null {
  const value = formData.get("parentId")
  return typeof value === "string" && value.length > 0 ? value : null
}

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
    parentId: parentIdFromForm(formData),
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    }
  }

  const parentError = await validateParent(parsed.data.parentId)
  if (parentError) {
    return { ok: false, error: parentError, fieldErrors: { parentId: [parentError] } }
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
    parentId: parentIdFromForm(formData),
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

  const parentError = await validateParent(parsed.data.parentId, categoryId)
  if (parentError) {
    return { ok: false, error: parentError, fieldErrors: { parentId: [parentError] } }
  }

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

export async function deleteCategory(
  categoryId: string,
): Promise<ActionResult> {
  await requireAdmin()

  const [existing] = await db
    .select({ slug: categories.slug })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)

  // The DB would refuse anyway (parent_id is `restrict`), but failing here
  // gives the editor an explanation instead of a constraint violation.
  const [child] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.parentId, categoryId))
    .limit(1)

  if (child) {
    return {
      ok: false,
      error: "Delete or move its sub-collections first.",
    }
  }

  // Photo rows cascade. The stored objects are intentionally left in place;
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

/** Called by the uploader once a PUT to R2 has succeeded, once per file. */
export async function attachUploadedPhoto(input: {
  categoryId: string
  storageKey: string
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

  /*
   * Read the object rather than trusting the browser's account of it. Two
   * different kinds of fact come back:
   *
   *  - dimensions are a precondition. A row with wrong geometry produces a
   *    permanently misshapen gallery, and failing to decode the file is how we
   *    learn it is not the image it claimed to be.
   *  - the EXIF prefill and the blur placeholder are conveniences, and degrade
   *    to empty rather than failing the upload.
   */
  const inspection = await inspectUploadedImage(parsed.data.storageKey)

  if (!inspection.ok) {
    /*
     * No row will reference this object, so remove it. Deleting a photo through
     * the admin deliberately leaves its object in place — that is a reversible
     * decision about content — whereas this one never became content at all,
     * and leaving it would accumulate bytes nothing can ever find again.
     */
    await deleteObject(parsed.data.storageKey).catch(() => {})
    return { ok: false, error: inspection.error }
  }

  const [{ value: currentMax }] = await db
    .select({ value: max(photos.sortIndex) })
    .from(photos)
    .where(eq(photos.categoryId, category.id))

  const [created] = await db
    .insert(photos)
    .values({
      categoryId: category.id,
      storageKey: parsed.data.storageKey,
      width: inspection.width,
      height: inspection.height,
      blurDataUrl: inspection.blurDataUrl,
      // Alt text is required for the public site but cannot be known at upload
      // time. Start unpublished so a photo can never reach visitors without a
      // description having been written for it.
      alt: "",
      // The capture year is more precise than the collection's when known.
      year: inspection.exif?.year ?? category.year,
      camera: inspection.exif?.camera ?? "",
      lens: inspection.exif?.lens ?? "",
      settings: inspection.exif?.settings ?? "",
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
 * Publish every unpublished photo in a collection that already has alt text.
 * Photos still missing alt are left alone and reported so the editor can fix
 * them without hunting through rows that did publish.
 */
export async function publishAllPhotos(
  categoryId: string,
): Promise<
  ActionResult & { publishedCount?: number; skippedMissingAlt?: number }
> {
  await requireAdmin()

  const [category] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.id, categoryId))
    .limit(1)

  if (!category) return { ok: false, error: "Collection not found." }

  const drafts = await db
    .select({ id: photos.id, alt: photos.alt })
    .from(photos)
    .where(and(eq(photos.categoryId, categoryId), eq(photos.published, false)))

  if (drafts.length === 0) {
    return { ok: false, error: "Nothing left to publish." }
  }

  const readyIds = drafts
    .filter((photo) => photo.alt.trim().length > 0)
    .map((photo) => photo.id)
  const skippedMissingAlt = drafts.length - readyIds.length

  if (readyIds.length === 0) {
    return {
      ok: false,
      error: "Add alt text before publishing. Every draft is still missing it.",
      skippedMissingAlt,
    }
  }

  await db
    .update(photos)
    .set({ published: true, updatedAt: new Date() })
    .where(
      and(
        eq(photos.categoryId, categoryId),
        eq(photos.published, false),
        sql`trim(${photos.alt}) <> ''`,
      ),
    )

  invalidateContent(await slugForCategory(categoryId))
  return {
    ok: true,
    publishedCount: readyIds.length,
    skippedMissingAlt,
  }
}

/**
 * Soft delete by default: unpublishing removes a photo from the site while
 * keeping the row and the stored object, so a mistake is reversible. Hard
 * deletion is a separate, explicit action — and even it leaves the object, so
 * the photo can be re-added from the bucket.
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
// Gear page
// ---------------------------------------------------------------------------

export async function updateGear(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin()

  /*
   * Groups are a nested variable-length structure, so the form submits them as
   * one JSON field rather than repeated inputs. The payload is still fully
   * validated by gearSchema below — the JSON.parse only establishes shape.
   */
  let groups: unknown
  try {
    groups = JSON.parse(String(formData.get("groups") ?? "[]"))
  } catch {
    return { ok: false, error: "Could not read the gear groups." }
  }

  const parsed = gearSchema.safeParse({
    year: formData.get("year"),
    intro: formData.get("intro") ?? "",
    groups,
  })

  if (!parsed.success) {
    return {
      ok: false,
      error: "Please fix the highlighted fields.",
      fieldErrors: fieldErrorsOf(parsed.error),
    }
  }

  const [existing] = await db
    .select({ id: gearPage.id })
    .from(gearPage)
    .limit(1)

  if (existing) {
    await db
      .update(gearPage)
      .set({ ...parsed.data, updatedAt: new Date() })
      .where(eq(gearPage.id, existing.id))
  } else {
    await db.insert(gearPage).values(parsed.data)
  }

  updateTag(GEAR_TAG)
  return { ok: true }
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
  revalidateTag(GEAR_TAG, "max")
  return { ok: true }
}
