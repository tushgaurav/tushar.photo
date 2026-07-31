import Image from "next/image"
import Link from "next/link"
import { notFound } from "next/navigation"

import { Suspense } from "react"

import { PendingRows } from "@/components/admin/pending-rows"
import { PhotoForm } from "@/components/admin/photo-form"
import { ADMIN_SAMPLE_PARAMS } from "@/lib/admin-sample-params"
import { requireAdmin } from "@/lib/auth-guard"
import { getAdminPhoto } from "@/lib/queries/admin"

export function generateStaticParams() {
  return ADMIN_SAMPLE_PARAMS
}

export default async function AdminPhotoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<PendingRows rows={8} />}>
      <PhotoBody id={id} />
    </Suspense>
  )
}

async function PhotoBody({ id }: { id: string }) {
  await requireAdmin()

  const photo = await getAdminPhoto(id)
  if (!photo) notFound()

  return (
    <div className="flex flex-col gap-8">
      <header>
        <Link
          href={`/admin/categories/${photo.categoryId}`}
          className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
        >
          {"[ ← collection ]"}
        </Link>
        <h1 className="mt-4 text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-5xl">
          edit photo
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-10 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <div className="relative aspect-[4/5] w-full overflow-hidden bg-black">
            <Image
              src={photo.fullUrl}
              alt={photo.alt || "Uploaded photo"}
              fill
              sizes="(max-width: 1024px) 100vw, 40vw"
              className="object-contain grayscale"
            />
          </div>
          <dl className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt>Dimensions</dt>
              <dd className="font-mono">
                {photo.width}×{photo.height}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Object key</dt>
              <dd className="truncate font-mono">{photo.storageKey}</dd>
            </div>
          </dl>
        </div>

        <div className="lg:col-span-3">
          <PhotoForm photo={photo} />
        </div>
      </div>
    </div>
  )
}
