/**
 * The kit listed on `/gear`.
 *
 * Static on purpose: it changes a handful of times a year, so it lives in the
 * repo rather than the database and the admin.
 */

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

export const GEAR_YEAR = "2025"

export const GEAR_INTRO =
  "Placeholder — the working list of what I shoot with. Nothing here is precious; most of it was bought used and all of it is meant to be used."

export const GEAR_GROUPS: GearGroup[] = [
  {
    title: "Cameras",
    items: [
      {
        name: "Camera body one",
        note: "Placeholder. What it is for and why it stays in the bag.",
        year: "2024",
      },
      {
        name: "Camera body two",
        note: "Placeholder. The backup, or the one that goes out on quiet walks.",
        year: "2022",
      },
    ],
  },
  {
    title: "Lenses",
    items: [
      {
        name: "35mm prime",
        note: "Placeholder. The lens that covers most of the street work.",
        year: "2024",
      },
      {
        name: "85mm prime",
        note: "Placeholder. Portraits, and anything that needs compression.",
        year: "2023",
      },
      {
        name: "Telephoto zoom",
        note: "Placeholder. Wildlife, and reaching across a landscape.",
        year: "2023",
      },
    ],
  },
  {
    title: "Everything else",
    items: [
      {
        name: "Tripod",
        note: "Placeholder. Long exposures and anything after dusk.",
        year: "2022",
      },
      {
        name: "Bag",
        note: "Placeholder. Carries a body, two lenses and not much more.",
        year: "2021",
      },
      {
        name: "Editing",
        note: "Placeholder. Where the black and white conversions happen.",
        year: "2021",
      },
    ],
  },
]
