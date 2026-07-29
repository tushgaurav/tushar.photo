/**
 * Legacy content, retained only as the input to `scripts/seed.ts`.
 *
 * The site no longer reads this file — galleries come from Postgres via
 * `lib/queries/photos.ts`. It stays in the repo so the original content can be
 * re-seeded into a fresh database, and can be deleted once that is no longer
 * useful. Editing it has no effect on the live site.
 */

export type LegacyPhoto = {
  src: string
  alt: string
  caption?: string
  location?: string
  year: string
  layout: "left" | "right" | "full"
  camera: string
  lens: string
  settings: string
}

export type LegacyCategory = {
  slug: string
  name: string
  index: number
  year: string
  intro: string
  photos: LegacyPhoto[]
}

export const categories: LegacyCategory[] = [
  {
    slug: "streets",
    name: "streets",
    index: 1,
    year: "2025",
    intro:
      "The street never poses. It just happens, and you're either there or you're not. These are the moments I was lucky enough to be there for — light cutting through alleys, strangers mid-thought, the city breathing.",
    photos: [
      {
        src: "/photos/streets-1.png",
        alt: "Rickshaw silhouette in light rays through a narrow Old Delhi alley",
        caption:
          "Old Delhi, 6:40 AM. The light only does this for about ten minutes. I'd been coming back to this alley for three mornings before the rickshaw finally crossed at the right second.",
        location: "Chandni Chowk, Delhi",
        year: "2025",
        layout: "left",
        camera: "FUJIFILM X-T4",
        lens: "23MM F/1.4",
        settings: "F/4 · 1/250S · ISO 800",
      },
      {
        src: "/photos/streets-2.png",
        alt: "Chai vendor pouring tea with steam rising in dramatic light",
        year: "2025",
        layout: "full",
        camera: "FUJIFILM X-T4",
        lens: "35MM F/1.4",
        settings: "F/2 · 1/500S · ISO 1600",
      },
      {
        src: "/photos/streets-3.png",
        alt: "Lone cyclist crossing an empty rain-soaked street at dawn",
        caption:
          "After the rain, before the city woke up. One cyclist, one street, nothing else. Sometimes the best frames are the emptiest ones.",
        location: "Greater Noida",
        year: "2024",
        layout: "right",
        camera: "FUJIFILM X-T4",
        lens: "23MM F/1.4",
        settings: "F/5.6 · 1/125S · ISO 400",
      },
      {
        src: "/photos/streets-4.png",
        alt: "Still figure on a railway platform as a train blurs past",
        year: "2024",
        layout: "full",
        camera: "FUJIFILM X-T4",
        lens: "16MM F/2.8",
        settings: "F/8 · 1/15S · ISO 200",
      },
      {
        src: "/photos/streets-5.png",
        alt: "Barber working inside an old shop lit by window light",
        caption:
          "He's been cutting hair in this same chair for thirty years. He didn't mind the camera. He didn't notice it, honestly.",
        location: "Dhanbad, Jharkhand",
        year: "2024",
        layout: "left",
        camera: "FUJIFILM X-T4",
        lens: "35MM F/1.4",
        settings: "F/1.8 · 1/250S · ISO 3200",
      },
    ],
  },
  {
    slug: "wildlife",
    name: "wildlife",
    index: 2,
    year: "2025",
    intro:
      "Animals don't perform for you. You wait, you watch, and occasionally they let you in. Every frame here cost hours of sitting still — and every one was worth it.",
    photos: [
      {
        src: "/photos/wildlife-2.png",
        alt: "Leopard walking down a slope, viewed from above with strong shadow",
        caption:
          "I'm not great with words. That's why I take photos. Every image here has a story — someone I met, a place I walked through, a moment I didn't expect but couldn't let pass.",
        location: "Jhalana, Rajasthan",
        year: "2025",
        layout: "left",
        camera: "SONY A7 IV",
        lens: "200-600MM F/5.6-6.3",
        settings: "F/6.3 · 1/1000S · ISO 800",
      },
      {
        src: "/photos/wildlife-1.png",
        alt: "Deer looking directly into the camera against pure black",
        year: "2025",
        layout: "full",
        camera: "SONY A7 IV",
        lens: "70-200MM F/2.8",
        settings: "F/2.8 · 1/640S · ISO 1250",
      },
      {
        src: "/photos/wildlife-3.png",
        alt: "Wild horses running through shallow water under an overcast sky",
        caption:
          "Total chaos for four seconds, then silence. The spray, the muscle, the noise — and then they were gone like it never happened.",
        location: "Rann of Kutch",
        year: "2024",
        layout: "right",
        camera: "SONY A7 IV",
        lens: "70-200MM F/2.8",
        settings: "F/4 · 1/2000S · ISO 400",
      },
      {
        src: "/photos/wildlife-4.png",
        alt: "Eagle head in profile against a dark background",
        year: "2024",
        layout: "full",
        camera: "SONY A7 IV",
        lens: "200-600MM F/5.6-6.3",
        settings: "F/6.3 · 1/1600S · ISO 640",
      },
      {
        src: "/photos/wildlife-5.png",
        alt: "Elephant emerging from morning mist in tall grass",
        caption:
          "It appeared out of the fog like a building deciding to move. I forgot to breathe for the first three frames.",
        location: "Jim Corbett National Park",
        year: "2024",
        layout: "left",
        camera: "SONY A7 IV",
        lens: "70-200MM F/2.8",
        settings: "F/5 · 1/800S · ISO 1000",
      },
    ],
  },
  {
    slug: "landscapes",
    name: "landscapes",
    index: 3,
    year: "2025",
    intro:
      "Mountains don't care about your schedule. The light comes when it comes. These are the places that made me put the laptop down and just look.",
    photos: [
      {
        src: "/photos/landscapes-1.png",
        alt: "Himalayan peaks with dramatic clouds and snow ridges",
        caption:
          "First light on the ridge. I hiked up in the dark with numb fingers and a tripod I almost left behind. The mountain didn't care either way.",
        location: "Kedarkantha, Uttarakhand",
        year: "2025",
        layout: "left",
        camera: "FUJIFILM X-T4",
        lens: "16-55MM F/2.8",
        settings: "F/11 · 1/60S · ISO 160",
      },
      {
        src: "/photos/landscapes-4.png",
        alt: "Desert dunes with rippled texture and sharp shadow lines",
        year: "2025",
        layout: "full",
        camera: "FUJIFILM X-T4",
        lens: "55-200MM F/3.5-4.8",
        settings: "F/9 · 1/320S · ISO 200",
      },
      {
        src: "/photos/landscapes-2.png",
        alt: "Lone tree on a misty hillside",
        caption:
          "One tree, holding its ground in the fog. I think about this frame more than any other I've taken.",
        location: "Munnar, Kerala",
        year: "2024",
        layout: "right",
        camera: "FUJIFILM X-T4",
        lens: "55-200MM F/3.5-4.8",
        settings: "F/5.6 · 1/200S · ISO 320",
      },
      {
        src: "/photos/landscapes-3.png",
        alt: "Waterfall cascading over dark rocks in long exposure",
        year: "2024",
        layout: "full",
        camera: "FUJIFILM X-T4",
        lens: "16-55MM F/2.8",
        settings: "F/16 · 2S · ISO 100",
      },
      {
        src: "/photos/landscapes-5.png",
        alt: "Waves crashing on a rocky coastline under a stormy sky",
        caption:
          "Thirty-second exposure, salt spray on the lens, completely soaked. Would do it again tomorrow.",
        location: "Varkala, Kerala",
        year: "2024",
        layout: "left",
        camera: "FUJIFILM X-T4",
        lens: "16-55MM F/2.8",
        settings: "F/13 · 30S · ISO 100",
      },
    ],
  },
  {
    slug: "portraits",
    name: "portraits",
    index: 4,
    year: "2025",
    intro:
      "I'm an introvert. Pointing a camera at a stranger terrifies me. But every one of these photos started with a conversation I almost didn't have.",
    photos: [
      {
        src: "/photos/portraits-1.png",
        alt: "Elderly man with a weathered face and white beard in window light",
        caption:
          "He told me stories for an hour before I even raised the camera. By the time I did, the photo was already made — I just had to press the button.",
        location: "Varanasi",
        year: "2025",
        layout: "left",
        camera: "FUJIFILM X-T4",
        lens: "56MM F/1.2",
        settings: "F/1.6 · 1/320S · ISO 640",
      },
      {
        src: "/photos/portraits-5.png",
        alt: "Silhouette of a musician playing sitar against a bright window",
        year: "2025",
        layout: "full",
        camera: "FUJIFILM X-T4",
        lens: "35MM F/1.4",
        settings: "F/4 · 1/500S · ISO 200",
      },
      {
        src: "/photos/portraits-3.png",
        alt: "Close-up of a craftsman's hands shaping clay on a pottery wheel",
        caption:
          "Forty years of the same motion. His hands knew things his words couldn't say.",
        location: "Khurja, Uttar Pradesh",
        year: "2024",
        layout: "right",
        camera: "FUJIFILM X-T4",
        lens: "56MM F/1.2",
        settings: "F/2 · 1/200S · ISO 1600",
      },
      {
        src: "/photos/portraits-4.png",
        alt: "Child looking through a rain-streaked window",
        year: "2024",
        layout: "full",
        camera: "FUJIFILM X-T4",
        lens: "56MM F/1.2",
        settings: "F/1.4 · 1/250S · ISO 800",
      },
      {
        src: "/photos/portraits-2.png",
        alt: "Young woman laughing candidly with motion blur in her hair",
        caption:
          "The frame before this one was posed and lifeless. Then someone cracked a joke off-camera. That's the whole secret.",
        location: "Delhi",
        year: "2024",
        layout: "left",
        camera: "FUJIFILM X-T4",
        lens: "35MM F/1.4",
        settings: "F/2.8 · 1/160S · ISO 400",
      },
    ],
  },
]
