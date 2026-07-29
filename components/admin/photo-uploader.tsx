"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { CldUploadWidget } from "next-cloudinary"

import { attachUploadedPhoto } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

type UploadInfo = {
  public_id?: string
  width?: number
  height?: number
}

/**
 * Uploads go browser -> Cloudinary directly, signed by
 * /api/sign-cloudinary-params. They deliberately do not pass through a server
 * action: Vercel caps a serverless request body at 4.5 MB, which a full-size
 * camera file exceeds comfortably.
 */
export function PhotoUploader({ categoryId }: { categoryId: string }) {
  const router = useRouter()
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  /**
   * CldUploadWidget throws while rendering if either of these is missing, which
   * would take down the whole category editor rather than just the upload
   * button. Checking first keeps the rest of the page usable.
   */
  const missing = [
    ["NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME],
    ["NEXT_PUBLIC_CLOUDINARY_API_KEY", process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name)

  if (missing.length > 0) {
    return (
      <p className="text-sm text-destructive">
        Uploads are disabled: set {missing.join(" and ")}.
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <CldUploadWidget
        signatureEndpoint="/api/sign-cloudinary-params"
        options={{
          multiple: true,
          sources: ["local", "url"],
          clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "avif"],
          maxFileSize: 25_000_000,
        }}
        onError={() => setError("Upload failed. Please try again.")}
        onSuccess={async (result) => {
          const info = result?.info as UploadInfo | undefined

          if (!info?.public_id || !info.width || !info.height) {
            setError("Cloudinary did not return image details.")
            return
          }

          const response = await attachUploadedPhoto({
            categoryId,
            cloudinaryPublicId: info.public_id,
            width: info.width,
            height: info.height,
          })

          if (!response.ok) {
            setError(response.error)
            return
          }

          setError(null)
          setStatus("Uploaded. Add alt text, then publish.")
          // Pull in the new row; the page is a server component.
          router.refresh()
        }}
      >
        {({ open }) => (
          <div>
            <Button type="button" size="lg" onClick={() => open()}>
              Upload Photos
            </Button>
          </div>
        )}
      </CldUploadWidget>

      {status ? (
        <p role="status" className="text-xs text-muted-foreground">
          {status}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
