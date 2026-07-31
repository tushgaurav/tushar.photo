/**
 * One-time migration of the hardcoded content into Postgres.
 *
 *   pnpm db:seed                    # uploads public/photos/* to R2
 *   SEED_SKIP_UPLOAD=1 pnpm db:seed # inserts rows only, no R2 calls
 *
 * Sources:
 *   - categories and photos: lib/photos.ts
 *   - About page copy:        components/about-content.tsx (transcribed below)
 *
 * Idempotent: categories are matched on their unique slug and photos on
 * (category, storage_key), so re-running repairs rather than duplicates. Object
 * keys are derived from the source filename rather than randomly generated,
 * which is what makes that matching stable across runs.
 *
 * Intended for a fresh database. The rows already in production carry random
 * UUID keys, so this would insert alongside them rather than matching them.
 */
import { readFile } from "node:fs/promises"
import path from "node:path"

import { and, count, eq } from "drizzle-orm"

import { db } from "../lib/db"
import { aboutPage, categories, photos } from "../lib/db/schema"
import { describeStoredImage } from "../lib/image-metadata"
import { categories as sourceCategories } from "../lib/photos"
import { putObject, r2ConfigError } from "../lib/r2"

const KEY_PREFIX = process.env.IMAGE_KEY_PREFIX ?? "photos"
const SKIP_UPLOAD = process.env.SEED_SKIP_UPLOAD === "1"
const PUBLIC_DIR = path.join(process.cwd(), "public")

/** Paragraphs and links lifted verbatim from components/about-content.tsx. */
const ABOUT_PARAGRAPHS = [
  "I'm Tushar Gaurav. By day I'm a software developer — I build RoboGPT at Orangewood Labs, making robots understand what you're saying to them. This site is what happens when I close the laptop.",
  "I grew up in Dhanbad, Jharkhand, where my curiosity for how things work started early. Photography is how that curiosity looks outward. Code is precise and deterministic; the street is neither. That contrast is the whole appeal.",
  "I'm an introvert. Pointing a camera at a stranger terrifies me, and most of these photos started with a conversation I almost didn't have. I shoot mostly in black and white because it forces me to look at light, shape, and the moment — not the noise.",
  "This isn't a portfolio in the professional sense. It's a journal. A record of places I walked through, people I met, and moments I didn't expect but couldn't let pass.",
]

const ABOUT_LINKS = [
  { label: "TUSHGAURAV.COM", href: "https://www.tushgaurav.com" },
  { label: "MORE ABOUT ME", href: "https://www.tushgaurav.com/about" },
]

/** The portrait used as the About page hero, as a `/photos/...` src. */
const ABOUT_HERO_SRC = "/photos/portraits-5.png"

/**
 * Read intrinsic dimensions straight from the PNG IHDR chunk.
 *
 * PNG layout: 8-byte signature, then the IHDR chunk whose data begins at byte
 * 16 with width and height as big-endian uint32s. Avoids pulling in an image
 * library just to seed twenty files, and — unlike asking Cloudflare — works in
 * SEED_SKIP_UPLOAD mode, where there is no uploaded object to ask about, so rows
 * are never written with placeholder geometry.
 */
async function readPngSize(
  absPath: string,
): Promise<{ width: number; height: number }> {
  const buffer = await readFile(absPath)

  const isPng =
    buffer.length > 24 &&
    buffer.readUInt32BE(0) === 0x89504e47 &&
    buffer.toString("ascii", 12, 16) === "IHDR"

  if (!isPng) {
    throw new Error(`Not a PNG (or truncated): ${absPath}`)
  }

  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

type UploadResult = {
  storageKey: string
  width: number
  height: number
  blurDataUrl: string
}

async function uploadPhoto(src: string): Promise<UploadResult> {
  const basename = path.basename(src, path.extname(src))
  const storageKey = `${KEY_PREFIX}/${basename}.png`
  const absPath = path.join(PUBLIC_DIR, src)

  // Read locally either way: it is the only source of dimensions in skip mode,
  // and a cheap cross-check against what Cloudflare decodes in upload mode.
  const { width, height } = await readPngSize(absPath)

  if (SKIP_UPLOAD) {
    console.log(`  (skipped upload) ${storageKey} ${width}x${height}`)
    return { storageKey, width, height, blurDataUrl: "" }
  }

  await putObject({
    key: storageKey,
    body: new Uint8Array(await readFile(absPath)),
    contentType: "image/png",
  })

  // Best-effort: a missing placeholder is not worth failing a seed over.
  const blurDataUrl = await describeStoredImage(storageKey)
    .then((stored) => stored.blurDataUrl)
    .catch(() => "")

  console.log(`  uploaded ${storageKey} ${width}x${height}`)
  return { storageKey, width, height, blurDataUrl }
}

async function main() {
  if (!SKIP_UPLOAD) {
    const configError = r2ConfigError()
    if (configError) {
      throw new Error(
        `${configError}. Configure R2, or run with SEED_SKIP_UPLOAD=1.`,
      )
    }
  }

  // src -> photo row id, so the About hero can be linked after insertion.
  const photoIdBySrc = new Map<string, string>()

  for (const [categoryIndex, source] of sourceCategories.entries()) {
    console.log(`\n${source.slug}`)

    const [category] = await db
      .insert(categories)
      .values({
        slug: source.slug,
        name: source.name,
        sortIndex: categoryIndex,
        year: source.year,
        intro: source.intro,
        published: true,
      })
      .onConflictDoUpdate({
        target: categories.slug,
        set: {
          name: source.name,
          sortIndex: categoryIndex,
          year: source.year,
          intro: source.intro,
          updatedAt: new Date(),
        },
      })
      .returning({ id: categories.id })

    for (const [photoIndex, sourcePhoto] of source.photos.entries()) {
      const { storageKey, width, height, blurDataUrl } = await uploadPhoto(
        sourcePhoto.src,
      )

      const values = {
        categoryId: category.id,
        storageKey,
        width,
        height,
        blurDataUrl,
        alt: sourcePhoto.alt,
        caption: sourcePhoto.caption ?? null,
        location: sourcePhoto.location ?? null,
        year: sourcePhoto.year,
        layout: sourcePhoto.layout,
        camera: sourcePhoto.camera,
        lens: sourcePhoto.lens,
        settings: sourcePhoto.settings,
        // Array position in lib/photos.ts is the intended display order.
        sortIndex: photoIndex,
        published: true,
      }

      // No unique constraint spans (category_id, storage_key), so upsert by hand
      // rather than adding an index that only the seed needs.
      const existing = await db
        .select({ id: photos.id })
        .from(photos)
        .where(
          and(
            eq(photos.categoryId, category.id),
            eq(photos.storageKey, storageKey),
          ),
        )
        .limit(1)

      let photoId: string

      if (existing.length > 0) {
        photoId = existing[0].id
        await db
          .update(photos)
          .set({ ...values, updatedAt: new Date() })
          .where(eq(photos.id, photoId))
      } else {
        const [inserted] = await db
          .insert(photos)
          .values(values)
          .returning({ id: photos.id })
        photoId = inserted.id
      }

      photoIdBySrc.set(sourcePhoto.src, photoId)
    }
  }

  console.log("\nabout page")

  const heroPhotoId = photoIdBySrc.get(ABOUT_HERO_SRC) ?? null
  if (!heroPhotoId) {
    console.warn(`  warning: hero photo ${ABOUT_HERO_SRC} not found`)
  }

  const existingAbout = await db
    .select({ id: aboutPage.id })
    .from(aboutPage)
    .limit(1)

  if (existingAbout.length > 0) {
    await db
      .update(aboutPage)
      .set({
        heroPhotoId,
        paragraphs: ABOUT_PARAGRAPHS,
        links: ABOUT_LINKS,
        year: "2025",
        updatedAt: new Date(),
      })
      .where(eq(aboutPage.id, existingAbout[0].id))
    console.log("  updated")
  } else {
    await db.insert(aboutPage).values({
      heroPhotoId,
      paragraphs: ABOUT_PARAGRAPHS,
      links: ABOUT_LINKS,
      year: "2025",
    })
    console.log("  created")
  }

  const [categoryCount] = await db
    .select({ value: count() })
    .from(categories)
  const [photoCount] = await db.select({ value: count() }).from(photos)

  console.log(
    `\nDone. ${categoryCount.value} categories, ${photoCount.value} photos.`,
  )
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
