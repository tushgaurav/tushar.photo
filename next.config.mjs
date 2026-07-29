/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Caching is opt-in in Next.js 16. Without this, every page render would hit
   * Postgres, since the content now comes from the database rather than a
   * module. Reads opt in with `'use cache'` in lib/queries/*.
   */
  cacheComponents: true,

  images: {
    /**
     * Cloudinary already resizes, re-encodes, and CDN-caches every image, so
     * routing them through Next's optimizer would add a second, redundant
     * transformation step (and consume Vercel image quota for no benefit).
     */
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
}

export default nextConfig
