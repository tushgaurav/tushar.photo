import type { Thing, WithContext } from "schema-dts"

/**
 * Renders a Schema.org JSON-LD script tag. `<` is escaped so photo captions or
 * intros containing markup can never close the script element early.
 */
export function JsonLd({ data }: { data: WithContext<Thing> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data).replace(/</g, "\\u003c"),
      }}
    />
  )
}
