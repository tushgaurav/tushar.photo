import { HomeHero } from "@/components/home-hero"
import { IntroLoader } from "@/components/intro-loader"

export default function HomePage() {
  return (
    <IntroLoader>
      <HomeHero />
    </IntroLoader>
  )
}
