/**
 * Sample route params for the admin's dynamic segments.
 *
 * Cache Components requires every `generateStaticParams` to return at least one
 * value, which it renders at build time to verify the route handles runtime data
 * correctly. Admin detail pages have nothing worth prerendering, so this is a
 * deliberately non-existent ID: the page body suspends on the session read
 * before any query runs, and the build only captures the Suspense fallback.
 */
export const ADMIN_SAMPLE_PARAMS = [
  { id: "00000000-0000-0000-0000-000000000000" },
]
