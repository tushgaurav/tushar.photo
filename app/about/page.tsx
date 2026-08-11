import type { Metadata } from "next"

import { AboutContent } from "@/components/about-content"
import { getAboutContent } from "@/lib/queries/about"
import { getCategories } from "@/lib/queries/photos"

export const metadata: Metadata = {
  title: "About",
  description:
    "Tushar Gaurav is a software developer from Dhanbad, Jharkhand, documenting his photography journey in black and white.",
  alternates: { canonical: "/about" },
}

export default async function AboutPage() {
  const [about, categories] = await Promise.all([
    getAboutContent(),
    getCategories(),
  ])

  return <AboutContent about={about} collections={categories} />
}
