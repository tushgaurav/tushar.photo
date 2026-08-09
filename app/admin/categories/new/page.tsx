import Link from "next/link"

import { CategoryForm } from "@/components/admin/category-form"
import { requireAdmin } from "@/lib/auth-guard"
import { listCategories } from "@/lib/queries/admin"

export default async function NewCategoryPage({
  searchParams,
}: {
  searchParams: Promise<{ parent?: string }>
}) {
  await requireAdmin()

  const [{ parent }, categories] = await Promise.all([
    searchParams,
    listCategories(),
  ])

  const parentOptions = categories
    .filter((category) => category.parentId === null)
    .map((category) => ({ id: category.id, name: category.name }))

  const defaultParentId =
    parentOptions.find((option) => option.id === parent)?.id ?? null

  return (
    <div className="flex max-w-2xl flex-col gap-8">
      <header>
        <Link
          href="/admin/categories"
          className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
        >
          {"[ ← collections ]"}
        </Link>
        <h1 className="mt-4 text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-5xl">
          new collection
        </h1>
      </header>

      <CategoryForm
        parentOptions={parentOptions}
        defaultParentId={defaultParentId}
      />
    </div>
  )
}
