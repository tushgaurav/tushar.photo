import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { CategoryGallery } from "@/components/category-gallery"
import { categories, getAdjacentCategories, getCategory } from "@/lib/photos"

export function generateStaticParams() {
  return categories.map((c) => ({ category: c.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>
}): Promise<Metadata> {
  const { category } = await params
  const cat = getCategory(category)
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
  const cat = getCategory(category)
  if (!cat) notFound()

  const { prev, next } = getAdjacentCategories(category)

  return <CategoryGallery category={cat} prev={prev} next={next} />
}
