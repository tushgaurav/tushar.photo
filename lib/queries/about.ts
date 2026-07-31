import { eq } from "drizzle-orm"
import { cacheLife, cacheTag } from "next/cache"

import { ABOUT_TAG } from "../cache-tags"
import type { AboutContentData } from "../content"
import { photoUrl } from "../images"
import { db } from "../db"
import { aboutPage, photos } from "../db/schema"

/**
 * The About page document. There is exactly one row; `null` means the seed has
 * not run yet, which the page handles by rendering nothing rather than 404ing.
 */
export async function getAboutContent(): Promise<AboutContentData | null> {
  "use cache"
  cacheTag(ABOUT_TAG)
  cacheLife("max")

  const [row] = await db.select().from(aboutPage).limit(1)
  if (!row) return null

  let hero: AboutContentData["hero"] = null

  if (row.heroPhotoId) {
    const [heroRow] = await db
      .select({
        storageKey: photos.storageKey,
        blurDataUrl: photos.blurDataUrl,
        alt: photos.alt,
      })
      .from(photos)
      .where(eq(photos.id, row.heroPhotoId))
      .limit(1)

    if (heroRow) {
      hero = {
        src: photoUrl(heroRow.storageKey, { width: 1200 }),
        blurDataUrl: heroRow.blurDataUrl,
        alt: heroRow.alt,
      }
    }
  }

  return {
    year: row.year,
    paragraphs: row.paragraphs,
    links: row.links,
    hero,
  }
}
