/**
 * Placeholder shown while an admin page's dynamic content streams in.
 *
 * Admin pages are split into a static shell plus a Suspense-wrapped async body,
 * because Cache Components refuses to prerender a route that reads uncached data
 * without a boundary around it.
 */
export function PendingRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="flex flex-col gap-3" aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-12 animate-pulse rounded bg-muted/40" />
      ))}
    </div>
  )
}
