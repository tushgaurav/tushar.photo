/**
 * Cloudflare Image Transformations URL helpers.
 *
 * Photos are stored as an R2 object key, never a full URL, so the delivery
 * transformation stays a render-time decision. Changing how images are sized or
 * compressed becomes a code change rather than a data migration.
 *
 * Delivery URLs take the form
 *
 *   https://<host>/cdn-cgi/image/<options>/<key>
 *
 * where `<host>` is the custom domain attached to the R2 bucket. Cloudflare
 * fetches `https://<host>/<key>` as the source, transforms it, and caches the
 * result at the edge. Because the source and the transformation are served from
 * the same hostname on the same zone, no transformation source allowlist entry
 * is needed — same-zone sources are permitted by default.
 *
 * Only the original is ever stored. Every size below is derived at the edge.
 */

function imageHost(): string {
  const host = process.env.NEXT_PUBLIC_IMAGE_HOST
  if (!host) {
    throw new Error("NEXT_PUBLIC_IMAGE_HOST is not set")
  }
  return host
}

/**
 * Cloudflare offers no content-aware quality setting, so this is one number for
 * every photo. 82 keeps grain and shadow gradation intact on the high-ISO
 * black-and-white frames this site is mostly made of, where lower values band
 * visibly across large flat areas.
 */
const DEFAULT_QUALITY = 82

/**
 * Wide enough to carry the frame's shape and tonal balance, small enough that
 * the base64 stays a few hundred bytes. Upscaling by the browser is what
 * produces the blur, so no explicit blur radius is involved.
 */
export const BLUR_WIDTH = 16

type PhotoUrlOptions = {
  /** Target width in pixels. Cloudflare downscales but never upscales. */
  width?: number
  /**
   * `auto` lets Cloudflare pick AVIF/WebP per browser from the `Accept` header,
   * and is almost always what you want. Anything more specific is a ceiling
   * rather than an instruction: without a matching `Accept` header Cloudflare
   * still falls back to JPEG. There is no PNG output.
   */
  format?: "auto" | "avif" | "webp" | "jpeg" | "baseline-jpeg"
  quality?: number
  grayscale?: boolean
}

/**
 * Build a delivery URL for a stored object key.
 *
 * Note the site's monochrome look is applied with a CSS `grayscale` filter in
 * the gallery components, not here. `grayscale: true` is available for cases
 * where the pixels themselves must be desaturated (social preview images, for
 * example, since Open Graph consumers do not run CSS).
 */
export function photoUrl(key: string, options: PhotoUrlOptions = {}): string {
  const {
    width,
    format = "auto",
    quality = DEFAULT_QUALITY,
    grayscale = false,
  } = options

  const params = [
    // Fit within the bounds, never enlarging an original that is already
    // smaller than the target.
    "fit=scale-down",
    width ? `width=${width}` : null,
    `format=${format}`,
    `quality=${quality}`,
    grayscale ? "saturation=0" : null,
  ]
    .filter(Boolean)
    .join(",")

  return `https://${imageHost()}/cdn-cgi/image/${params}/${key}`
}

/**
 * The stored original, untransformed. Used by the upload pipeline to read EXIF
 * out of the file the camera actually wrote; delivery never uses this, since
 * serving a 25 MB original to a browser is exactly what the transformations
 * exist to avoid.
 */
export function originalUrl(key: string): string {
  return `https://${imageHost()}/${key}`
}

/**
 * Cloudflare's `format=json` decodes the image and reports its true dimensions
 * and MIME type instead of returning pixels. More trustworthy than EXIF's
 * dimension tags, which are written before cropping and go stale after an edit.
 *
 * `anim=false` skips frame counting, which is only ever slower here.
 */
export function metadataUrl(key: string): string {
  return `https://${imageHost()}/cdn-cgi/image/format=json,anim=false/${key}`
}

/**
 * The tiny image that becomes the stored `blurDataURL`. WebP rather than
 * `format=auto` because this is fetched once by the server and then inlined, so
 * there is no browser to negotiate with and no reason to pay AVIF's encode cost
 * on sixteen pixels.
 *
 * Asking is not the same as getting: Cloudflare only honours this if the request
 * also carries an `Accept` header advertising WebP, otherwise it falls back to
 * JPEG. `lib/image-metadata.ts` sends that header and, regardless, labels the
 * data URL from the response rather than from this filename.
 */
export function blurSourceUrl(key: string): string {
  return `https://${imageHost()}/cdn-cgi/image/width=${BLUR_WIDTH},format=webp,quality=40/${key}`
}
