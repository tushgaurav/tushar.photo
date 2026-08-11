import type { MetadataRoute } from "next"

import { getCategories } from "@/lib/queries/photos"
import { SITE_URL } from "@/lib/site"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const categories = await getCategories()

  const galleryPaths = categories.flatMap((category) => [
    category.path,
    ...category.children.map((child) => child.path),
  ])

  return [
    { url: SITE_URL, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/about`, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/gear`, changeFrequency: "monthly", priority: 0.5 },
    ...galleryPaths.map((path) => ({
      url: `${SITE_URL}/${path}`,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ]
}
