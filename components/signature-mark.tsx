import Image from "next/image"

const SIGN = {
  light: { src: "/tushar-sign-black.jpg", width: 420, height: 100 },
  dark: { src: "/tushar-sign-white.png", width: 1087, height: 229 },
} as const

/**
 * The handwritten signature that stands in for the "TUSHAR GAURAV" wordmark.
 *
 * `tone` picks the ink for the surface it sits on; `corner` is the slightly
 * smaller cut for the home hero, where the sign shares the row with the big
 * category word and the menu trigger.
 */
export function SignatureMark({
  tone = "light",
  layout = "row",
}: {
  tone?: keyof typeof SIGN
  layout?: "row" | "corner"
}) {
  const sign = SIGN[tone]
  return (
    <Image
      src={sign.src}
      alt="Tushar Gaurav"
      width={sign.width}
      height={sign.height}
      className={`w-auto object-contain select-none ${
        layout === "corner" ? "h-7 md:h-10" : "h-9 md:h-12"
      }`}
    />
  )
}
