import exifr from "exifr"

import { deriveExifFields, type ExifFields } from "@/lib/exif"
import { blurSourceUrl, metadataUrl } from "@/lib/images"
import { getObjectHead } from "@/lib/r2"
import { MAX_UPLOAD_BYTES, isUploadContentType } from "@/lib/upload-limits"

/**
 * Everything the photos table needs about a freshly uploaded object, read from
 * the object itself rather than taken on the client's word.
 *
 * Each fact comes from whichever source is actually authoritative for it:
 *
 *  - dimensions and MIME type from Cloudflare's `format=json`, which decodes the
 *    image. EXIF carries dimension tags too, but they are written before
 *    cropping and go stale after any edit.
 *  - EXIF from the head of the original in R2, which is the only copy that still
 *    has it. Cloudflare strips metadata from everything it transforms.
 *  - the blur placeholder from a 16px transformation, so no image library and no
 *    full-size download are involved.
 *
 * Not marked `server-only` for the same reason as `lib/r2.ts`: `scripts/seed.ts`
 * needs it, and that package throws outside a React Server Component graph. The
 * `window` guard in `lib/r2.ts` covers the import chain.
 */

/**
 * Generous enough for any camera's EXIF block, which sits in the file header,
 * and small enough that reading it never approaches a serverless function's
 * memory or time budget the way a 25 MB original would.
 */
const EXIF_HEAD_BYTES = 256 * 1024

/**
 * A 16px WebP is a few hundred bytes. Anything an order of magnitude larger
 * means the transformation did not do what was expected, and inlining it into
 * every row of every gallery response would cost more than the placeholder is
 * worth.
 */
const MAX_BLUR_BYTES = 4096

/** Fresh uploads are read back through the CDN, so allow for a cold miss. */
const INFO_ATTEMPTS = 3

export type StoredImage = {
  width: number
  height: number
  /** As Cloudflare reports it after decoding, empty when it did not say. */
  mime: string
  /** Null when Cloudflare did not report one. */
  fileSize: number | null
  /** Empty when the placeholder could not be generated. */
  blurDataUrl: string
}

export type InspectResult =
  | ({ ok: true } & Omit<StoredImage, "mime" | "fileSize"> & {
        /** Null when the file carries no usable camera metadata. */
        exif: ExifFields | null
      })
  | { ok: false; error: string }

/**
 * Cloudflare's JSON output. The documented shape nests the source image's facts
 * under `original`, with the post-resize dimensions at the top level; with no
 * resize requested the two agree. Both are read, preferring `original`, so a
 * change in either does not silently produce wrong geometry.
 */
function readImageInfo(payload: unknown): {
  width: number
  height: number
  mime: string
  fileSize: number | null
} | null {
  if (!payload || typeof payload !== "object") return null

  const root = payload as Record<string, unknown>
  const original =
    root.original && typeof root.original === "object"
      ? (root.original as Record<string, unknown>)
      : {}

  const width = positiveInt(original.width) ?? positiveInt(root.width)
  const height = positiveInt(original.height) ?? positiveInt(root.height)

  if (width === null || height === null) return null

  const mime =
    typeof original.format === "string"
      ? original.format
      : typeof root.format === "string"
        ? root.format
        : ""

  return {
    width,
    height,
    mime,
    fileSize: positiveInt(original.file_size) ?? positiveInt(root.file_size),
  }
}

function positiveInt(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null
  }
  return Math.round(value)
}

/**
 * Rejects rather than falling back on a default, because a row with wrong
 * dimensions produces a permanently misshapen gallery, and because failing to
 * decode is the signal that the object is not the image it claims to be.
 */
async function fetchImageInfo(key: string) {
  let lastError = "no response"

  for (let attempt = 1; attempt <= INFO_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(metadataUrl(key), { cache: "no-store" })

      if (response.ok) {
        const info = readImageInfo(await response.json())
        if (info) return info
        lastError = "Cloudflare returned no usable dimensions"
      } else {
        lastError = `Cloudflare responded ${response.status}`
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : "request failed"
    }

    if (attempt < INFO_ATTEMPTS) {
      await new Promise((resolve) => setTimeout(resolve, 250 * attempt))
    }
  }

  throw new Error(lastError)
}

/**
 * Best-effort: returns an empty string rather than throwing. A missing
 * placeholder costs a visible flash of empty space on first paint, which is not
 * worth failing an upload that has already succeeded.
 */
async function fetchBlurDataUrl(key: string): Promise<string> {
  try {
    const response = await fetch(blurSourceUrl(key), {
      cache: "no-store",
      /*
       * Required, not decorative. Cloudflare treats `format=webp` as a ceiling
       * rather than an instruction: with no Accept header advertising WebP it
       * quietly serves JPEG instead, which for a 16px thumbnail measures about
       * four times the bytes (451 vs 116 on a test frame). Node's fetch sends no
       * image Accept header of its own, unlike a browser.
       */
      headers: { Accept: "image/webp,image/*" },
    })
    if (!response.ok) return ""

    const bytes = new Uint8Array(await response.arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_BLUR_BYTES) return ""

    /*
     * Labelled with what came back rather than what was requested. Cloudflare is
     * free to answer in a different format, and a data URL that misdeclares its
     * payload is left to browser sniffing to rescue.
     */
    const mime = (response.headers.get("content-type") ?? "")
      .split(";")[0]
      .trim()

    if (!mime.startsWith("image/")) return ""

    return `data:${mime};base64,${Buffer.from(bytes).toString("base64")}`
  } catch {
    return ""
  }
}

/**
 * Reads the EXIF the camera wrote, from the head of the stored original.
 *
 * `reviveValues: false` keeps dates as their raw "2024:03:15 10:22:31" strings.
 * `lib/exif.ts` reads the year off the front of that with a regex, and would
 * otherwise be handed a Date object it has no branch for.
 */
async function fetchExif(key: string): Promise<ExifFields | null> {
  try {
    const head = await getObjectHead(key, EXIF_HEAD_BYTES)

    /*
     * `ifd0` is not listed because exifr cannot disable it — that block is where
     * Make and Model live and is always parsed. `exif` adds the sub-IFD holding
     * aperture, shutter, ISO, lens, and capture date.
     */
    const parsed: unknown = await exifr.parse(head, {
      exif: true,
      reviveValues: false,
    })

    if (!parsed || typeof parsed !== "object") return null

    return deriveExifFields(parsed as Record<string, unknown>)
  } catch {
    return null
  }
}

/**
 * Facts about an object that is already in the bucket, with no policy attached.
 *
 * Separate from `inspectUploadedImage` so that describing an object and deciding
 * whether it is an acceptable upload stay independent. Anything already in the
 * bucket has, by definition, already been accepted, and should not be re-judged
 * against rules that may have tightened since — `scripts/seed.ts` reads this for
 * files it has just written itself.
 *
 * Throws when the image cannot be decoded, which is not a recoverable condition
 * for either caller.
 */
export async function describeStoredImage(key: string): Promise<StoredImage> {
  const info = await fetchImageInfo(key)

  return { ...info, blurDataUrl: await fetchBlurDataUrl(key) }
}

/**
 * Everything needed to insert a row for a freshly uploaded object, plus the
 * checks that decide whether it is allowed to become one.
 *
 * The content type is verified here rather than at presign time because the
 * presigner drops it from the signature entirely, so what the client declared is
 * not binding. What Cloudflare reports after decoding the bytes is.
 */
export async function inspectUploadedImage(
  key: string,
): Promise<InspectResult> {
  let info: StoredImage

  try {
    info = await describeStoredImage(key)
  } catch (error) {
    return {
      ok: false,
      error: `Could not read the uploaded image: ${
        error instanceof Error ? error.message : "unknown error"
      }`,
    }
  }

  if (info.mime && !isUploadContentType(info.mime)) {
    return { ok: false, error: `Unsupported image type: ${info.mime}` }
  }

  if (info.fileSize !== null && info.fileSize > MAX_UPLOAD_BYTES) {
    return {
      ok: false,
      error: `That file is ${Math.round(
        info.fileSize / 1_000_000,
      )} MB, over the ${MAX_UPLOAD_BYTES / 1_000_000} MB limit.`,
    }
  }

  return {
    ok: true,
    width: info.width,
    height: info.height,
    blurDataUrl: info.blurDataUrl,
    exif: await fetchExif(key),
  }
}
