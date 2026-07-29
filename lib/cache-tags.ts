/**
 * Cache tag names, centralised so a read and the mutation that invalidates it
 * cannot drift apart. A typo in a tag string fails silently — the cache simply
 * never invalidates — so these are never written inline.
 */

/** Every category list and gallery. Broad on purpose: photo edits shift ordering and prev/next links. */
export const CONTENT_TAG = "content"

/** A single gallery page. */
export function categoryTag(slug: string): string {
  return `category:${slug}`
}

/** The About page document. */
export const ABOUT_TAG = "about"
