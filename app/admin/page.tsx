import Link from "next/link"

import { RevalidateButton } from "@/components/admin/revalidate-button"
import { requireAdmin } from "@/lib/auth-guard"
import { getAdminStats, listCategories } from "@/lib/queries/admin"

export default async function AdminDashboard() {
  await requireAdmin()

  const [stats, categories] = await Promise.all([
    getAdminStats(),
    listCategories(),
  ])

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <h1 className="text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-6xl">
          dashboard
        </h1>
        <RevalidateButton />
      </header>

      <dl className="grid grid-cols-2 gap-4 md:grid-cols-3">
        <Stat label="Collections" value={stats.categories} />
        <Stat label="Photos" value={stats.photos} />
        <Stat
          label="Published"
          value={`${stats.publishedPhotos}/${stats.photos}`}
        />
      </dl>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold tracking-widest uppercase">
            Collections
          </h2>
          <Link
            href="/admin/categories"
            className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
          >
            Manage
          </Link>
        </div>

        {categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collections yet.{" "}
            <Link href="/admin/categories/new" className="underline">
              Create the first one
            </Link>
            .
          </p>
        ) : (
          <ul className="divide-y divide-border border-y border-border">
            {categories.map((category) => (
              <li key={category.id}>
                <Link
                  href={`/admin/categories/${category.id}`}
                  className="flex items-center justify-between gap-4 py-3 transition-opacity hover:opacity-60"
                >
                  <span className="flex items-baseline gap-3">
                    <span className="text-sm font-medium lowercase">
                      {category.name}
                    </span>
                    <span className="font-mono text-xs text-muted-foreground">
                      /{category.slug}
                    </span>
                  </span>
                  <span className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span>
                      {category.photoCount}{" "}
                      {category.photoCount === 1 ? "photo" : "photos"}
                    </span>
                    {!category.published ? (
                      <span className="font-bold tracking-widest uppercase text-destructive">
                        Draft
                      </span>
                    ) : null}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border border-border p-4">
      <dt className="text-xs font-bold tracking-widest uppercase text-muted-foreground">
        {label}
      </dt>
      <dd className="mt-2 text-3xl font-extrabold tracking-tighter">{value}</dd>
    </div>
  )
}
