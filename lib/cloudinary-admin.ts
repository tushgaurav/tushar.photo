import "server-only"

import { v2 as cloudinary } from "cloudinary"

import type { ImageMetadata } from "@/lib/exif"

/**
 * Cloudinary Admin API access, which needs the API secret and so must never be
 * reachable from the browser.
 *
 * This is deliberately not part of `lib/cloudinary.ts`. That module is imported
 * by `components/admin/photo-uploader.tsx`, a client component, and pulling the
 * Node SDK in through it would drag the whole thing into the client bundle.
 * The `server-only` import turns that mistake into a build error rather than a
 * leaked secret.
 */

/**
 * Reads the EXIF the camera wrote, from Cloudinary's copy of the original.
 *
 * Asking Cloudinary rather than parsing in the browser keeps the upload payload
 * to the public ID and dimensions, so there is no new client-supplied data to
 * validate, and no change to what has to be signed.
 *
 * Returns null instead of throwing when the asset has no metadata or the
 * account is not configured: callers treat this as a convenience, never a
 * precondition.
 */
export async function fetchImageMetadata(
  publicId: string,
): Promise<ImageMetadata | null> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET

  if (!cloudName || !apiKey || !apiSecret) return null

  /*
   * Credentials are passed per call rather than through cloudinary.config(),
   * which sets global state on a module shared with the signing route.
   */
  const resource = await cloudinary.api.resource(publicId, {
    image_metadata: true,
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
  })

  const metadata: unknown = resource?.image_metadata

  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) {
    return null
  }

  return metadata as ImageMetadata
}
