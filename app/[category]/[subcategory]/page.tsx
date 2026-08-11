import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { CategoryGallery } from "@/components/category-gallery"
import { JsonLd } from "@/components/json-ld"
import {
  getCategories,
  getSubcollection,
  getSubcollectionParams,
} from "@/lib/queries/photos"
import { SITE_URL } from "@/lib/site"

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

  const title = `${result.category.name} — ${result.parent.name}`
  const cover = result.category.heroPhotos[0]

  return {
    title,
    description: result.category.intro,
    alternates: { canonical: `/${result.category.path}` },
    openGraph: {
      title: `${title} — Tushar Gaurav Photography`,
      description: result.category.intro,
      url: `/${result.category.path}`,
      images: cover ? [{ url: cover.ogSrc, alt: cover.alt }] : undefined,
    },
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
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ImageGallery",
          name: `${result.category.name} — ${result.parent.name} — Tushar Gaurav Photography`,
          description: result.category.intro,
          url: `${SITE_URL}/${result.category.path}`,
          author: { "@type": "Person", name: "Tushar Gaurav", url: SITE_URL },
          image: result.category.photos.map((photo) => ({
            "@type": "ImageObject",
            contentUrl: photo.ogSrc,
            description: photo.alt,
            ...(photo.caption ? { caption: photo.caption } : {}),
            ...(photo.location ? { contentLocation: photo.location } : {}),
          })),
        }}
      />
      <CategoryGallery
        category={result.category}
        prev={result.prev}
        next={result.next}
        collections={all}
        backHref={`/${result.parent.slug}`}
        backLabel={`[ ← ${result.parent.name.toUpperCase()} ]`}
        counterTotal={result.siblingCount}
      />
    </>
  )
}
