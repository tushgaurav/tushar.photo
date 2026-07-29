import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CategoryGallery } from "@/components/category-gallery"
import {
  getAdjacentCategories,
  getCategories,
  getCategory,
  getCategorySlugs,
} from "@/lib/queries/photos"

export async function generateStaticParams() {
  const slugs = await getCategorySlugs()
  return slugs.map((category) => ({ category }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = await getCategory(category)
  if (!cat) return {}

  return {
    title: `${cat.name} — Tushar Gaurav Photography`,
    description: cat.intro,
  }
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params

  const [cat, adjacent, all] = await Promise.all([
    getCategory(category),
    getAdjacentCategories(category),
    getCategories(),
  ])

  if (!cat) notFound()

  return (
    <CategoryGallery
      category={cat}
      prev={adjacent?.prev ?? null}
      next={adjacent?.next ?? null}
      collections={all}
    />
  )
}
