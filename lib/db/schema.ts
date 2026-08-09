import { relations } from "drizzle-orm"
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  type AnyPgColumn,
} from "drizzle-orm/pg-core"

/**
 * Controls how a photo is placed in the gallery grid. Mirrors the union that
 * `components/category-gallery.tsx` already switches on.
 */
export const photoLayout = pgEnum("photo_layout", ["left", "right", "full"])

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    /**
     * Self-reference enabling one level of nesting: a top-level collection
     * (null) can contain sub-collections (set). Sub-collections cannot have
     * children of their own — enforced in the admin actions, not here.
     * `restrict` so deleting a parent cannot silently cascade through its
     * sub-collections and take every photo record with it.
     */
    parentId: uuid("parent_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    /**
     * Display order. Replaces the hand-maintained `index` field from the old
     * `lib/photos.ts`, and also drives prev/next navigation between galleries.
     */
    sortIndex: integer("sort_index").notNull().default(0),
    year: text("year").notNull(),
    intro: text("intro").notNull().default(""),
    published: boolean("published").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [uniqueIndex("categories_slug_idx").on(table.slug)],
)

export const photos = pgTable("photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  categoryId: uuid("category_id")
    .notNull()
    .references(() => categories.id, { onDelete: "cascade" }),

  /**
   * R2 object key rather than a full URL, so transformations (width, format,
   * quality) stay a render-time decision instead of being baked into stored
   * data.
   */
  storageKey: text("storage_key").notNull(),
  /** Intrinsic dimensions, needed to reserve layout space and avoid CLS. */
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  /**
   * A 16px-wide WebP inlined as a data URL, used as the `blurDataURL`
   * placeholder. Stored rather than derived because Cloudflare bills per unique
   * transformation, and because inlining it costs one fewer request per image
   * than pointing the placeholder at a URL.
   */
  blurDataUrl: text("blur_data_url").notNull().default(""),

  alt: text("alt").notNull(),
  caption: text("caption"),
  location: text("location"),
  year: text("year").notNull(),
  layout: photoLayout("layout").notNull().default("full"),

  camera: text("camera").notNull().default(""),
  lens: text("lens").notNull().default(""),
  settings: text("settings").notNull().default(""),

  sortIndex: integer("sort_index").notNull().default(0),
  published: boolean("published").notNull().default(true),

  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type AboutLink = {
  label: string
  href: string
}

/**
 * Single-row table backing `/about`. Kept as one row with JSONB columns rather
 * than a paragraphs table, because the copy is always read and written as a
 * whole document — there is nothing to query or join on individually.
 */
export const aboutPage = pgTable("about_page", {
  id: uuid("id").primaryKey().defaultRandom(),
  heroPhotoId: uuid("hero_photo_id").references(() => photos.id, {
    onDelete: "set null",
  }),
  /** First entry renders as the larger lead paragraph. */
  paragraphs: jsonb("paragraphs").$type<string[]>().notNull().default([]),
  links: jsonb("links").$type<AboutLink[]>().notNull().default([]),
  year: text("year").notNull().default("2025"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export type GearItem = {
  name: string
  /** One line on what it is used for, or why it earns its place in the bag. */
  note: string
  /** Year it joined the bag, shown as `[2024]`. */
  year: string
}

export type GearGroup = {
  title: string
  items: GearItem[]
}

/**
 * Single-row table backing `/gear`. Same reasoning as `about_page`: the kit
 * list is always read and written as a whole document, so nested groups live
 * in one JSONB column rather than two extra tables.
 */
export const gearPage = pgTable("gear_page", {
  id: uuid("id").primaryKey().defaultRandom(),
  year: text("year").notNull().default("2025"),
  intro: text("intro").notNull().default(""),
  groups: jsonb("groups").$type<GearGroup[]>().notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const categoriesRelations = relations(categories, ({ one, many }) => ({
  photos: many(photos),
  parent: one(categories, {
    fields: [categories.parentId],
    references: [categories.id],
    relationName: "categoryChildren",
  }),
  children: many(categories, { relationName: "categoryChildren" }),
}))

export const photosRelations = relations(photos, ({ one }) => ({
  category: one(categories, {
    fields: [photos.categoryId],
    references: [categories.id],
  }),
}))

export const aboutPageRelations = relations(aboutPage, ({ one }) => ({
  heroPhoto: one(photos, {
    fields: [aboutPage.heroPhotoId],
    references: [photos.id],
  }),
}))

export type CategoryRow = typeof categories.$inferSelect
export type NewCategoryRow = typeof categories.$inferInsert
export type PhotoRow = typeof photos.$inferSelect
export type NewPhotoRow = typeof photos.$inferInsert
export type AboutPageRow = typeof aboutPage.$inferSelect
export type GearPageRow = typeof gearPage.$inferSelect
