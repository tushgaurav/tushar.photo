import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

/**
 * Cloudflare R2 access. R2 speaks the S3 API, so the AWS SDK is the client.
 *
 * Deliberately not marked with `server-only`. That package throws under every
 * resolution condition except `react-server`, which would break
 * `scripts/seed.ts` — it runs under plain `tsx` and legitimately writes to the
 * bucket. The `window` check below buys the same protection, turning an
 * accidental client import into a loud failure rather than silently shipped
 * credentials, in a way that survives being run as an ordinary Node script.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "lib/r2 reads the R2 secret key and must never be imported from client code.",
  )
}

/**
 * Presigned URLs are only ever handed to an authenticated admin who uses them
 * immediately, so this is short by design: it bounds how long a leaked URL is a
 * usable write handle on the bucket.
 */
const PRESIGN_TTL_SECONDS = 300

function required(name: string): string {
  const value = process.env[name]
  // Treat empty as absent: .env.local ships these blank, and a blank endpoint
  // or key produces a far more confusing failure deeper in the SDK.
  if (!value) {
    throw new Error(`${name} is not set`)
  }
  return value
}

export function r2Bucket(): string {
  return required("R2_BUCKET")
}

/**
 * Returns null rather than throwing when R2 is unconfigured, so callers that
 * only want to know whether uploads are possible can ask without a try/catch.
 */
export function r2ConfigError(): string | null {
  for (const name of [
    "R2_ACCOUNT_ID",
    "R2_ACCESS_KEY_ID",
    "R2_SECRET_ACCESS_KEY",
    "R2_BUCKET",
  ]) {
    if (!process.env[name]) return `${name} is not set`
  }
  return null
}

let client: S3Client | null = null

/**
 * Built on first use rather than at module load, so importing this module is
 * safe in an environment where R2 is not configured. Cached because each
 * serverless invocation may presign several uploads.
 */
function r2(): S3Client {
  if (client) return client

  client = new S3Client({
    // R2 is a single global namespace with no notion of a region, but SigV4
    // requires one in the signature. "auto" is what Cloudflare specifies.
    region: "auto",
    endpoint: `https://${required("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: required("R2_ACCESS_KEY_ID"),
      secretAccessKey: required("R2_SECRET_ACCESS_KEY"),
    },
    /*
     * Mandatory, not an optimisation. The SDK's default of "WHEN_SUPPORTED"
     * attaches a CRC32 of the request body to every PutObject. When presigning
     * there is no body yet, so it signs the checksum of nothing
     * (x-amz-checksum-crc32=AAAAAA==), which then cannot match the bytes the
     * browser actually sends, and R2 rejects the upload.
     */
    requestChecksumCalculation: "WHEN_REQUIRED",
  })

  return client
}

/**
 * A URL the browser can PUT one object to, and nothing else.
 *
 * `ContentLength` lands in `X-Amz-SignedHeaders`, so it is part of the
 * signature rather than merely advisory: R2 rejects a body whose length differs
 * from the signed value. The browser computes `Content-Length` from the body
 * itself and script cannot override it, so the size cap the caller checked is
 * enforced rather than trusted.
 *
 * `ContentType` gets no such guarantee — the presigner drops it from both the
 * signature and the query string, leaving the stored type to be whatever the
 * client sends. That matters because an object stored as `text/html` would be
 * served as a page from the image host. It is therefore verified after the fact
 * against the type Cloudflare reports from decoding the file, in
 * `lib/image-metadata.ts`, which is a stronger check than a claimed header
 * anyway.
 */
export async function presignUpload({
  key,
  contentLength,
}: {
  key: string
  contentLength: number
}): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: r2Bucket(),
    Key: key,
    ContentLength: contentLength,
  })

  return getSignedUrl(r2(), command, { expiresIn: PRESIGN_TTL_SECONDS })
}

export async function putObject({
  key,
  body,
  contentType,
}: {
  key: string
  body: Uint8Array
  contentType: string
}): Promise<void> {
  await r2().send(
    new PutObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Body: body,
      ContentType: contentType,
    }),
  )
}

/**
 * The first `byteCount` bytes of an object.
 *
 * EXIF lives in the file header, so reading a couple of hundred kilobytes is
 * enough to parse it. Pulling a whole 25 MB original into a serverless function
 * to read its first few hundred bytes would be slow and, on a large enough
 * file, would risk the invocation's memory and time limits.
 */
export async function getObjectHead(
  key: string,
  byteCount: number,
): Promise<Uint8Array> {
  const response = await r2().send(
    new GetObjectCommand({
      Bucket: r2Bucket(),
      Key: key,
      Range: `bytes=0-${byteCount - 1}`,
    }),
  )

  if (!response.Body) {
    throw new Error(`R2 returned no body for ${key}`)
  }

  return response.Body.transformToByteArray()
}

/**
 * Used only to clean up an upload that was rejected before a row was written
 * for it. Deleting a photo through the admin deliberately leaves its object in
 * place, so this is not part of that path.
 */
export async function deleteObject(key: string): Promise<void> {
  await r2().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }))
}
