import Link from "next/link"

import { CategoryReorderList } from "@/components/admin/category-reorder-list"
import { Button } from "@/components/ui/button"
import { requireAdmin } from "@/lib/auth-guard"
import { listCategories } from "@/lib/queries/admin"

export default async function AdminCategoriesPage() {
  await requireAdmin()

  const categories = await listCategories()

  const topLevel = categories.filter((category) => category.parentId === null)
  const childrenByParent: Record<string, typeof categories> = {}
  for (const category of categories) {
    if (!category.parentId) continue
    childrenByParent[category.parentId] ??= []
    childrenByParent[category.parentId].push(category)
  }

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-6xl">
            collections
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Drag to reorder. The order here sets the sequence on the home page
            and the prev/next links.
          </p>
        </div>
        <Button render={<Link href="/admin/categories/new" />} size="lg">
          New Collection
        </Button>
      </header>

      {categories.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No collections yet. Create one to get started.
        </p>
      ) : (
        <CategoryReorderList
          categories={topLevel}
          childrenByParent={childrenByParent}
        />
      )}
    </div>
  )
}
