import { HomeHero } from "@/components/home-hero"
import { IntroLoader } from "@/components/intro-loader"
import { getCategories } from "@/lib/queries/photos"

export default async function HomePage() {
  const categories = await getCategories()

  return (
    <IntroLoader>
      <HomeHero categories={categories} />
    </IntroLoader>
  )
}
