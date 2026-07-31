"use client"

import { useRouter } from "next/navigation"
import { useRef, useState } from "react"

import { attachUploadedPhoto } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import {
  MAX_UPLOAD_BYTES,
  UPLOAD_ACCEPT,
  formatBytes,
  isUploadContentType,
} from "@/lib/upload-limits"

/**
 * Uploads go browser -> R2 directly, against a URL signed by
 * /api/uploads/presign. They deliberately do not pass through a server action:
 * Vercel caps a serverless request body at 4.5 MB, which a full-size camera file
 * exceeds comfortably.
 *
 * Nothing here checks that storage is configured before rendering. It does not
 * need to: no path in this component throws during render, and the presign
 * endpoint names the missing variable precisely when asked.
 */

/**
 * Two at a time. Camera files are large enough that more parallelism mostly
 * competes for the same upstream bandwidth, and a photographer watching two
 * progress bars finish can tell what is happening in a way that eight cannot.
 */
const CONCURRENCY = 2

type ItemStatus = "queued" | "uploading" | "saving" | "done" | "error"

type Item = {
  id: string
  name: string
  size: number
  /** Percent of bytes sent, for the `uploading` phase only. */
  progress: number
  status: ItemStatus
  error?: string
}

export function PhotoUploader({ categoryId }: { categoryId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<Item[]>([])
  const [dragging, setDragging] = useState(false)
  const [busy, setBusy] = useState(false)

  function update(id: string, patch: Partial<Item>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    )
  }

  async function handleFiles(files: File[]) {
    if (files.length === 0) return

    // Assign the queue entries up front so the list appears immediately, before
    // any network work, and so each file has a stable id to report against.
    const queued = files.map((file) => ({
      file,
      item: {
        id: crypto.randomUUID(),
        name: file.name,
        size: file.size,
        progress: 0,
        status: "queued" as ItemStatus,
      },
    }))

    setItems((current) => [...current, ...queued.map(({ item }) => item)])
    setBusy(true)

    let uploaded = 0

    await runPool(queued, CONCURRENCY, async ({ file, item }) => {
      // Checked here for immediate feedback, and again server-side because a
      // client-side check is a convenience rather than a guarantee.
      const rejection = rejectionReason(file)
      if (rejection) {
        update(item.id, { status: "error", error: rejection })
        return
      }

      try {
        update(item.id, { status: "uploading" })

        const key = await uploadToR2(file, (progress) =>
          update(item.id, { progress }),
        )

        update(item.id, { status: "saving", progress: 100 })

        const result = await attachUploadedPhoto({
          categoryId,
          storageKey: key,
        })

        if (!result.ok) {
          update(item.id, { status: "error", error: result.error })
          return
        }

        uploaded += 1
        update(item.id, { status: "done" })
      } catch (error) {
        update(item.id, {
          status: "error",
          error: error instanceof Error ? error.message : "Upload failed",
        })
      }
    })

    setBusy(false)

    // One refresh for the whole batch rather than one per file: the page is a
    // server component, so each refresh is a full round trip.
    if (uploaded > 0) router.refresh()
  }

  const done = items.filter((item) => item.status === "done").length
  const failed = items.filter((item) => item.status === "error").length

  return (
    <div className="flex flex-col gap-3">
      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setDragging(false)
          void handleFiles(Array.from(event.dataTransfer.files))
        }}
        className={`flex flex-col items-start gap-3 border border-dashed p-6 transition-colors ${
          dragging ? "border-foreground bg-muted" : "border-border"
        }`}
      >
        {/*
          Kept reachable by assistive technology rather than hidden outright, so
          a screen reader user gets the real file input instead of having to go
          through the button that proxies to it.
        */}
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={UPLOAD_ACCEPT}
          aria-label="Choose photos to upload"
          className="sr-only"
          onChange={(event) => {
            void handleFiles(Array.from(event.target.files ?? []))
            // Clear the input so re-picking the same file fires onChange again.
            event.target.value = ""
          }}
        />

        <Button
          type="button"
          size="lg"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? "Uploading…" : "Upload Photos"}
        </Button>

        <p className="text-xs text-muted-foreground">
          Or drop files here. JPEG, PNG, WebP or AVIF, up to{" "}
          {formatBytes(MAX_UPLOAD_BYTES)} each. Uploads start unpublished so you
          can add alt text first.
        </p>
      </div>

      {items.length > 0 ? (
        <>
          <ul className="flex flex-col gap-1">
            {items.map((item) => (
              <UploadRow key={item.id} item={item} />
            ))}
          </ul>

          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span>
              {done} uploaded
              {failed > 0 ? `, ${failed} failed` : ""}
            </span>
            {!busy ? (
              <button
                type="button"
                onClick={() => setItems([])}
                className="underline transition-opacity hover:opacity-60"
              >
                Clear list
              </button>
            ) : null}
          </div>
        </>
      ) : null}
    </div>
  )
}

function UploadRow({ item }: { item: Item }) {
  return (
    <li className="flex items-center gap-3 text-xs">
      <span className="w-4 shrink-0 text-center" aria-hidden="true">
        {item.status === "done" ? "✓" : item.status === "error" ? "✕" : "·"}
      </span>

      <span className="min-w-0 flex-1 truncate font-mono">{item.name}</span>

      {item.status === "uploading" ? (
        <span className="flex items-center gap-2">
          {/*
            A width-driven bar rather than <progress>, which cannot be styled
            consistently across browsers and would stand out against the rest of
            the admin.
          */}
          <span className="block h-px w-24 bg-border">
            <span
              className="block h-px bg-foreground transition-[width] duration-150"
              style={{ width: `${item.progress}%` }}
            />
          </span>
          <span className="w-8 text-right tabular-nums text-muted-foreground">
            {item.progress}%
          </span>
        </span>
      ) : (
        <span
          role={item.status === "error" ? "alert" : undefined}
          className={
            item.status === "error"
              ? "text-destructive"
              : "text-muted-foreground"
          }
        >
          {item.status === "error"
            ? item.error
            : item.status === "saving"
              ? "Reading metadata…"
              : item.status === "done"
                ? formatBytes(item.size)
                : "Queued"}
        </span>
      )}
    </li>
  )
}

/** Null when the file is acceptable, otherwise the reason to show. */
function rejectionReason(file: File): string | null {
  if (!isUploadContentType(file.type)) {
    return file.type
      ? `${file.type} is not a supported image type`
      : "Unrecognised file type"
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${formatBytes(file.size)} is over the ${formatBytes(
      MAX_UPLOAD_BYTES,
    )} limit`
  }
  if (file.size === 0) return "File is empty"
  return null
}

/**
 * Presign, then PUT, returning the object key the server chose.
 */
async function uploadToR2(
  file: File,
  onProgress: (progress: number) => void,
): Promise<string> {
  const response = await fetch("/api/uploads/presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ contentType: file.type, contentLength: file.size }),
  })

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error: unknown }).error)
        : `Could not start the upload (${response.status})`
    throw new Error(message)
  }

  if (
    !payload ||
    typeof payload !== "object" ||
    typeof (payload as { url?: unknown }).url !== "string" ||
    typeof (payload as { key?: unknown }).key !== "string"
  ) {
    throw new Error("Malformed response from the signing endpoint")
  }

  const { url, key } = payload as { url: string; key: string }

  await put(url, file, onProgress)

  return key
}

/**
 * XMLHttpRequest rather than fetch, purely for `upload.onprogress`: fetch cannot
 * report how much of a request body has been sent, and these are 25 MB files
 * over a domestic connection, where a bar that moves is the difference between
 * waiting and assuming it has hung.
 */
function put(
  url: string,
  file: File,
  onProgress: (progress: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest()

    request.open("PUT", url, true)
    /*
     * Content-Type is not part of the signature, so sending it neither helps nor
     * breaks the signature check — it is sent so R2 stores the object with a
     * sensible type. What is ultimately trusted is the type Cloudflare reports
     * after decoding the file, checked server-side once the upload lands.
     */
    request.setRequestHeader("Content-Type", file.type)

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100))
      }
    }

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve()
        return
      }
      // R2's body on failure is XML, too noisy to surface. The status separates
      // the cases that matter: 403 is a signature or size mismatch, 4xx a bad
      // request, 5xx worth retrying.
      reject(new Error(`Storage rejected the upload (${request.status})`))
    }

    request.onerror = () => reject(new Error("Network error during upload"))
    request.onabort = () => reject(new Error("Upload cancelled"))

    request.send(file)
  })
}

/**
 * Runs `worker` over `items`, at most `limit` at a time. Each runner pulls the
 * next index rather than the list being split into fixed chunks, so one slow
 * file does not leave the other lane idle.
 */
async function runPool<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  let cursor = 0

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (cursor < items.length) {
        const index = cursor
        cursor += 1
        await worker(items[index])
      }
    }),
  )
}
