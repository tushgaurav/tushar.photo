import Link from "next/link"

import { CategoryForm } from "@/components/admin/category-form"
import { requireAdmin } from "@/lib/auth-guard"

export default async function NewCategoryPage() {
  await requireAdmin()

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

      <CategoryForm />
    </div>
  )
}
