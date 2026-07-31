import { z } from "zod"

/**
 * Shared between the admin forms and the server actions.
 *
 * The actions validate independently of the forms — a server action is a public
 * HTTP endpoint, so client-side validation is a convenience, never a guarantee.
 */

const trimmed = z.string().trim()

/** Lowercase, hyphenated, URL-safe. Also becomes the public route segment. */
export const slugSchema = trimmed
  .min(1, "Required")
  .max(60, "Too long")
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Lowercase letters, numbers and single hyphens only",
  )
  .refine((value) => !RESERVED_SLUGS.has(value), {
    message: "That word is reserved by another route",
  })

/**
 * Categories are served from the root (`/streets`), so a slug colliding with a
 * real route would shadow it and make that page unreachable.
 */
const RESERVED_SLUGS = new Set([
  "about",
  "admin",
  "api",
  "sign-in",
  "sign-out",
  "photos",
  "_next",
  "favicon.ico",
])

export const categorySchema = z.object({
  slug: slugSchema,
  name: trimmed.min(1, "Required").max(60, "Too long"),
  year: trimmed.regex(/^\d{4}$/, "Four-digit year"),
  intro: trimmed.max(2000, "Too long").default(""),
  published: z.boolean().default(true),
})

export type CategoryInput = z.infer<typeof categorySchema>

export const photoLayoutSchema = z.enum(["left", "right", "full"])

export const photoSchema = z.object({
  alt: trimmed
    .min(1, "Required for screen readers")
    .max(300, "Too long"),
  caption: trimmed.max(2000, "Too long").optional().or(z.literal("")),
  location: trimmed.max(200, "Too long").optional().or(z.literal("")),
  year: trimmed.regex(/^\d{4}$/, "Four-digit year"),
  layout: photoLayoutSchema,
  camera: trimmed.max(120, "Too long").default(""),
  lens: trimmed.max(120, "Too long").default(""),
  settings: trimmed.max(120, "Too long").default(""),
  published: z.boolean().default(true),
})

export type PhotoInput = z.infer<typeof photoSchema>

/**
 * What the uploader reports once a PUT to R2 has succeeded.
 *
 * Only the key: dimensions and EXIF are read from the stored object rather than
 * accepted from the browser, so there is nothing else here to be wrong about.
 *
 * The key is shape-checked against what /api/uploads/presign issues — a prefix,
 * a canonical UUID, an allowed extension. That is not the security boundary on
 * its own (the object is inspected before any row is written), but it stops a
 * malformed or attacker-chosen path from reaching R2 at all.
 */
export const uploadedPhotoSchema = z.object({
  categoryId: z.string().uuid(),
  storageKey: trimmed.regex(
    /^[a-z0-9][a-z0-9/_-]*\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp|avif)$/,
    "Not an object key this server issued",
  ),
})

export const aboutSchema = z.object({
  year: trimmed.regex(/^\d{4}$/, "Four-digit year"),
  paragraphs: z
    .array(trimmed.min(1, "Empty paragraph"))
    .max(20, "Too many paragraphs"),
  links: z
    .array(
      z.object({
        label: trimmed.min(1, "Required").max(60, "Too long"),
        // Restricted to http(s) so a `javascript:` URL cannot be stored and
        // then rendered into an anchor on the public page.
        href: trimmed.url("Must be a valid URL").refine(
          (value) =>
            value.startsWith("http://") || value.startsWith("https://"),
          "Must start with http:// or https://",
        ),
      }),
    )
    .max(10, "Too many links"),
  heroPhotoId: z.string().uuid().nullable(),
})

export type AboutInput = z.infer<typeof aboutSchema>

/** Explicit ordering payload for the reorder action. */
export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).min(1),
})

/**
 * Normalises the optional text fields to `null`, so an emptied form field
 * clears the column rather than storing an empty string that then renders as a
 * blank caption block.
 */
export function emptyToNull(value: string | undefined): string | null {
  if (value === undefined) return null
  const trimmedValue = value.trim()
  return trimmedValue.length > 0 ? trimmedValue : null
}
