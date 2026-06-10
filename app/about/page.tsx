import type { Metadata } from "next"
import { AboutContent } from "@/components/about-content"

export const metadata: Metadata = {
  title: "About — Tushar Gaurav Photography",
  description:
    "Tushar Gaurav is a software developer from Dhanbad, Jharkhand, documenting his photography journey in black and white.",
}

export default function AboutPage() {
  return <AboutContent />
}
