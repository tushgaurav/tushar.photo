import { randomUUID } from "node:crypto"

import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { presignUpload, r2ConfigError } from "@/lib/r2"
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_EXTENSIONS,
  isUploadContentType,
} from "@/lib/upload-limits"

/**
 * Issues a presigned URL the browser can PUT one photo to.
 *
 * Uploads go browser -> R2 directly rather than through a server action because
 * Vercel caps a serverless request body at 4.5 MB, which a full-size camera file
 * exceeds comfortably. That makes this endpoint a write handle on the bucket, so
 * it is hardened three ways:
 *
 *  1. A valid session is required. An open signing endpoint is effectively an
 *     anonymous write handle — anyone could upload arbitrary files and run up
 *     the bill.
 *  2. The object key is generated here, not accepted from the caller. A client
 *     never names the object it writes, so traversal outside the prefix,
 *     collisions with an existing photo, and overwriting someone else's asset
 *     are all impossible by construction rather than validated against.
 *  3. The size cap is bound into the signature. `Content-Length` is one of the
 *     signed headers, and the browser computes it from the body rather than
 *     letting script set it, so R2 itself rejects a body of any other length.
 *
 * The declared content type is only used to choose the file extension. It is not
 * signed — the presigner drops it — so what actually gets stored is verified
 * against the decoded image later, in `lib/image-metadata.ts`.
 */

/**
 * Deliberately not `NEXT_PUBLIC_`: the browser has no need to know where uploads
 * land, because it does not get to choose.
 */
const KEY_PREFIX = process.env.IMAGE_KEY_PREFIX ?? "photos"

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const configError = r2ConfigError()
  if (configError) {
    return Response.json(
      { error: `R2 is not configured: ${configError}` },
      { status: 500 },
    )
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const { contentType, contentLength } = (body ?? {}) as {
    contentType?: unknown
    contentLength?: unknown
  }

  if (typeof contentType !== "string" || !isUploadContentType(contentType)) {
    return Response.json(
      {
        error: `Unsupported file type. Allowed: ${Object.keys(
          UPLOAD_EXTENSIONS,
        ).join(", ")}`,
      },
      { status: 400 },
    )
  }

  if (
    typeof contentLength !== "number" ||
    !Number.isInteger(contentLength) ||
    contentLength <= 0
  ) {
    return Response.json({ error: "Invalid file size" }, { status: 400 })
  }

  if (contentLength > MAX_UPLOAD_BYTES) {
    return Response.json(
      { error: `Files must be under ${MAX_UPLOAD_BYTES / 1_000_000} MB` },
      { status: 400 },
    )
  }

  const key = `${KEY_PREFIX}/${randomUUID()}.${UPLOAD_EXTENSIONS[contentType]}`

  const url = await presignUpload({ key, contentLength })

  return Response.json({ key, url })
}
