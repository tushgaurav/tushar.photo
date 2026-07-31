import Link from "next/link"
import { notFound } from "next/navigation"

import { Suspense } from "react"

import { CategoryForm } from "@/components/admin/category-form"
import { DeleteCategoryButton } from "@/components/admin/delete-category-button"
import { PendingRows } from "@/components/admin/pending-rows"
import { PhotoManager } from "@/components/admin/photo-manager"
import { ADMIN_SAMPLE_PARAMS } from "@/lib/admin-sample-params"
import { requireAdmin } from "@/lib/auth-guard"
import { getAdminCategory } from "@/lib/queries/admin"

export function generateStaticParams() {
  return ADMIN_SAMPLE_PARAMS
}

export default async function AdminCategoryPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  return (
    <Suspense fallback={<PendingRows rows={8} />}>
      <CategoryBody id={id} />
    </Suspense>
  )
}

async function CategoryBody({ id }: { id: string }) {
  await requireAdmin()

  const category = await getAdminCategory(id)
  if (!category) notFound()

  return (
    <div className="flex flex-col gap-14">
      <header>
        <Link
          href="/admin/categories"
          className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
        >
          {"[ ← collections ]"}
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-6xl">
            {category.name}
          </h1>
          <Link
            href={`/${category.slug}`}
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
          >
            {"[ view live ↗ ]"}
          </Link>
        </div>
      </header>

      <section className="max-w-2xl">
        <h2 className="mb-6 text-xs font-bold tracking-widest uppercase text-muted-foreground">
          Details
        </h2>
        <CategoryForm
          category={{
            id: category.id,
            slug: category.slug,
            name: category.name,
            year: category.year,
            intro: category.intro,
            published: category.published,
          }}
        />
      </section>

      <section>
        <h2 className="mb-6 text-xs font-bold tracking-widest uppercase text-muted-foreground">
          Photos
        </h2>
        <PhotoManager categoryId={category.id} photos={category.photos} />
      </section>

      <section className="border-t border-border pt-8">
        <h2 className="mb-3 text-xs font-bold tracking-widest uppercase text-destructive">
          Danger zone
        </h2>
        <p className="mb-4 max-w-prose text-sm text-muted-foreground">
          Deleting this collection also deletes its {category.photos.length}{" "}
          photo {category.photos.length === 1 ? "record" : "records"}. The image
          files stay in storage, so they can be re-added, but the captions and
          settings written here would be lost.
        </p>
        <DeleteCategoryButton
          categoryId={category.id}
          categoryName={category.name}
        />
      </section>
    </div>
  )
}
