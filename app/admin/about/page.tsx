import Link from "next/link"

import { AboutForm } from "@/components/admin/about-form"
import { requireAdmin } from "@/lib/auth-guard"
import { getAdminAbout } from "@/lib/queries/admin"

export default async function AdminAboutPage() {
  await requireAdmin()

  const { about, photoOptions } = await getAdminAbout()

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-6xl">
            about page
          </h1>
          <Link
            href="/about"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
          >
            {"[ view live ↗ ]"}
          </Link>
        </div>
      </header>

      <AboutForm
        about={
          about
            ? {
                year: about.year,
                paragraphs: about.paragraphs,
                links: about.links,
                heroPhotoId: about.heroPhotoId,
              }
            : null
        }
        photoOptions={photoOptions}
      />
    </div>
  )
}
