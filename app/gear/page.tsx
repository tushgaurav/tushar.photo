import type { Metadata } from "next"

import { GearContent } from "@/components/gear-content"
import { getGearContent } from "@/lib/queries/gear"
import { getCategories } from "@/lib/queries/photos"

export const metadata: Metadata = {
  title: "Gear",
  description:
    "The cameras, lenses and everything else Tushar Gaurav shoots black and white photography with.",
  alternates: { canonical: "/gear" },
}

export default async function GearPage() {
  const [gear, categories] = await Promise.all([
    getGearContent(),
    getCategories(),
  ])

  return <GearContent gear={gear} collections={categories} />
}
