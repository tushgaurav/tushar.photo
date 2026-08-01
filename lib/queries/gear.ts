import { cacheLife, cacheTag } from "next/cache"

import { GEAR_TAG } from "../cache-tags"
import type { GearContentData } from "../content"
import { db } from "../db"
import { gearPage } from "../db/schema"
import { DEFAULT_GEAR } from "../gear"

/**
 * The Gear page document. There is exactly one row; before the first save from
 * the admin creates it, the hardcoded defaults are served so the public page
 * never renders empty.
 */
export async function getGearContent(): Promise<GearContentData> {
  "use cache"
  cacheTag(GEAR_TAG)
  cacheLife("max")

  const [row] = await db.select().from(gearPage).limit(1)
  if (!row) return DEFAULT_GEAR

  return {
    year: row.year,
    intro: row.intro,
    groups: row.groups,
  }
}
