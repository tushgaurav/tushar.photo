/**
 * What counts as an acceptable upload.
 *
 * Split out from `lib/r2.ts` so the browser can import it. That module reads the
 * R2 secret and pulls in the AWS SDK, so it refuses to load in a client bundle;
 * these constants carry no secret and are needed on both sides — the uploader
 * checks them for immediate feedback, and the presign route checks them again
 * because a client-side check is a convenience, never a guarantee.
 */

/** Comfortably above a full-frame RAW export, below any serverless limit. */
export const MAX_UPLOAD_BYTES = 25_000_000

/**
 * Accepted content types, mapped to the extension the stored key gets. An
 * allowlist rather than a denylist, and the extension comes from this table
 * rather than from the uploaded filename, so a client cannot influence the key
 * it writes to.
 */
export const UPLOAD_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
} as const

export type UploadContentType = keyof typeof UPLOAD_EXTENSIONS

export function isUploadContentType(value: string): value is UploadContentType {
  return value in UPLOAD_EXTENSIONS
}

/** Value for a file input's `accept`, so the picker filters by default. */
export const UPLOAD_ACCEPT = Object.keys(UPLOAD_EXTENSIONS).join(",")

export function formatBytes(bytes: number): string {
  if (bytes < 1000) return `${bytes} B`
  if (bytes < 1_000_000) return `${Math.round(bytes / 1000)} KB`
  return `${(bytes / 1_000_000).toFixed(1)} MB`
}
