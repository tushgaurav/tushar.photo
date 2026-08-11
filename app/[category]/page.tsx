import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CategoryGallery } from "@/components/category-gallery"
import { JsonLd } from "@/components/json-ld"
import type { Category } from "@/lib/content"
import {
  getAdjacentCategories,
  getCategories,
  getCategory,
  getCategorySlugs,
} from "@/lib/queries/photos"
import { SITE_URL } from "@/lib/site"

export async function generateStaticParams() {
  const slugs = await getCategorySlugs()
  return slugs.map((category) => ({ category }))
}

/** The photo social crawlers see: the category's cover, grayscale like the site. */
function ogImages(category: Category) {
  const cover = category.heroPhotos[0]
  if (!cover) return undefined
  return [{ url: cover.ogSrc, alt: cover.alt }]
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
    title: cat.name,
    description: cat.intro,
    alternates: { canonical: `/${cat.slug}` },
    openGraph: {
      title: `${cat.name} — Tushar Gaurav Photography`,
      description: cat.intro,
      url: `/${cat.slug}`,
      images: ogImages(cat),
    },
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
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: `${cat.name} — Tushar Gaurav Photography`,
          description: cat.intro,
          url: `${SITE_URL}/${cat.slug}`,
          author: { "@type": "Person", name: "Tushar Gaurav", url: SITE_URL },
          image: cat.photos.map((photo) => ({
            "@type": "ImageObject",
            contentUrl: photo.ogSrc,
            description: photo.alt,
            ...(photo.caption ? { caption: photo.caption } : {}),
            ...(photo.location ? { contentLocation: photo.location } : {}),
          })),
        }}
      />
      <CategoryGallery
        category={cat}
        prev={adjacent?.prev ?? null}
        next={adjacent?.next ?? null}
        collections={all}
        subcollections={cat.children}
      />
    </>
  )
}
