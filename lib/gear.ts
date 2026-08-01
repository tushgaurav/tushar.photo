import type { GearContentData } from "./content"

/**
 * Default content for `/gear`.
 *
 * The page is managed from the admin (a single `gear_page` row, edited as a
 * whole document like About). This default is what the public page serves
 * until that row exists, and what prefills the admin form on a fresh
 * database — so the site never renders an empty gear page.
 */
export const DEFAULT_GEAR: GearContentData = {
  year: "2025",
  intro:
    "Placeholder — the working list of what I shoot with. Nothing here is precious; most of it was bought used and all of it is meant to be used.",
  groups: [
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
  ],
}
