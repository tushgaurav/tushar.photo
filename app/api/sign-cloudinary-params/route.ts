import { v2 as cloudinary } from "cloudinary"
import { headers } from "next/headers"

import { auth } from "@/lib/auth"
import { CLOUDINARY_FOLDER } from "@/lib/cloudinary"

/**
 * Signs Cloudinary upload parameters for the browser-side upload widget.
 *
 * Two hardening steps over the vendor's example, which is unauthenticated and
 * signs whatever it is handed:
 *
 *  1. A valid session is required. An open signing endpoint is effectively an
 *     anonymous write handle on the Cloudinary account — anyone could upload
 *     arbitrary files and run up the bill.
 *  2. The folder is checked against the expected one, so a crafted client
 *     cannot scatter uploads across the account or overwrite assets belonging
 *     to something else.
 *
 * The folder is validated rather than injected. Cloudinary verifies the
 * signature against the parameters the browser actually sends, so adding a
 * parameter here that the widget does not send produces a signature over a
 * different string and the upload is rejected as "Invalid Signature".
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 })
  }

  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!apiSecret) {
    return Response.json({ error: "Cloudinary is not configured" }, { status: 500 })
  }

  let paramsToSign: Record<string, unknown>
  try {
    const body = await request.json()
    paramsToSign = body?.paramsToSign ?? {}
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  if (paramsToSign.folder !== CLOUDINARY_FOLDER) {
    return Response.json(
      { error: `Uploads must target the "${CLOUDINARY_FOLDER}" folder` },
      { status: 400 },
    )
  }

  const signature = cloudinary.utils.api_sign_request(paramsToSign, apiSecret)

  return Response.json({ signature })
}
