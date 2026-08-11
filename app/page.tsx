import type { Metadata } from "next"

import { HomeHero } from "@/components/home-hero"
import { IntroLoader } from "@/components/intro-loader"
import { JsonLd } from "@/components/json-ld"
import { getCategories } from "@/lib/queries/photos"
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site"

export const metadata: Metadata = {
  alternates: { canonical: "/" },
}

export default async function HomePage() {
  const categories = await getCategories()

  return (
    <>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          description: SITE_DESCRIPTION,
          url: SITE_URL,
          author: {
            "@type": "Person",
            name: "Tushar Gaurav",
            url: SITE_URL,
            knowsAbout: "Photography",
          },
        }}
      />
      <IntroLoader>
        <HomeHero categories={categories} />
      </IntroLoader>
    </>
  )
}
