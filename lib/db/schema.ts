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
   * Cloudinary public ID rather than a full URL, so transformations (width,
   * format, quality) stay a render-time decision instead of being baked into
   * stored data.
   */
  cloudinaryPublicId: text("cloudinary_public_id").notNull(),
  /** Intrinsic dimensions, needed to reserve layout space and avoid CLS. */
  width: integer("width").notNull(),
  height: integer("height").notNull(),

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

export const categoriesRelations = relations(categories, ({ many }) => ({
  photos: many(photos),
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
