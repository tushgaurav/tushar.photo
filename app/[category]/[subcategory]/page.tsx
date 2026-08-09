import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CategoryGallery } from "@/components/category-gallery"
import {
  getCategories,
  getSubcollection,
  getSubcollectionParams,
} from "@/lib/queries/photos"

export async function generateStaticParams() {
  const params = await getSubcollectionParams()

  // Cache Components requires at least one entry. Before any sub-collection
  // exists, hand back a non-existent pair; the build prerenders its 404.
  if (params.length === 0) {
    return [{ category: "placeholder", subcategory: "placeholder" }]
  }

  return params
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>
}): Promise<Metadata> {
  const { category, subcategory } = await params
  const result = await getSubcollection(category, subcategory)
  if (!result) return {}

  return {
    title: `${result.category.name} — ${result.parent.name} — Tushar Gaurav Photography`,
    description: result.category.intro,
  }
}

export default async function SubcollectionPage({
  params,
}: {
  params: Promise<{ category: string; subcategory: string }>
}) {
  const { category, subcategory } = await params

  const [result, all] = await Promise.all([
    getSubcollection(category, subcategory),
    getCategories(),
  ])

  if (!result) notFound()

  return (
    <CategoryGallery
      category={result.category}
      prev={result.prev}
      next={result.next}
      collections={all}
      backHref={`/${result.parent.slug}`}
      backLabel={`[ ← ${result.parent.name.toUpperCase()} ]`}
      counterTotal={result.siblingCount}
    />
  )
}
