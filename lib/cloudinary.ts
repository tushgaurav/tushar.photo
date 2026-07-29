/**
 * Cloudinary URL helpers.
 *
 * Photos are stored as a `cloudinary_public_id`, never a full URL, so the
 * delivery transformation stays a render-time decision. Changing how images are
 * sized or compressed becomes a code change rather than a data migration.
 */

export const CLOUDINARY_FOLDER =
  process.env.NEXT_PUBLIC_CLOUDINARY_FOLDER ?? "tushar-photo"

function cloudName(): string {
  const name = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  if (!name) {
    throw new Error("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME is not set")
  }
  return name
}

type PhotoUrlOptions = {
  /** Target width in pixels. Cloudinary downscales but never upscales. */
  width?: number
  /**
   * `auto` lets Cloudinary pick AVIF/WebP per browser via content negotiation.
   */
  format?: "auto" | "jpg" | "png" | "webp" | "avif"
  quality?: "auto" | "auto:best" | "auto:eco" | number
  grayscale?: boolean
}

/**
 * Build a delivery URL for a stored public ID.
 *
 * Note the site's monochrome look is applied with a CSS `grayscale` filter in
 * the gallery components, not here. `grayscale: true` is available for cases
 * where the pixels themselves must be desaturated (social preview images, for
 * example, since Open Graph consumers do not run CSS).
 */
export function photoUrl(
  publicId: string,
  options: PhotoUrlOptions = {},
): string {
  const { width, format = "auto", quality = "auto", grayscale = false } = options

  const transforms = [
    "c_limit",
    width ? `w_${width}` : null,
    `f_${format}`,
    `q_${quality}`,
    grayscale ? "e_grayscale" : null,
  ]
    .filter(Boolean)
    .join(",")

  return `https://res.cloudinary.com/${cloudName()}/image/upload/${transforms}/${publicId}`
}

/**
 * A tiny, heavily-blurred version for use as a `blurDataURL` placeholder.
 * Generated on the fly by Cloudinary rather than stored, so there is nothing to
 * keep in sync if the strategy changes.
 */
export function photoBlurUrl(publicId: string): string {
  return `https://res.cloudinary.com/${cloudName()}/image/upload/c_limit,w_24,e_blur:400,q_auto:eco,f_auto/${publicId}`
}
