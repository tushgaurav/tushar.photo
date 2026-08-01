import Link from "next/link"

import { GearForm } from "@/components/admin/gear-form"
import { requireAdmin } from "@/lib/auth-guard"
import { DEFAULT_GEAR } from "@/lib/gear"
import { getAdminGear } from "@/lib/queries/admin"

export default async function AdminGearPage() {
  await requireAdmin()

  const gear = await getAdminGear()

  return (
    <div className="flex max-w-4xl flex-col gap-8">
      <header>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <h1 className="text-4xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-6xl">
            gear page
          </h1>
          <Link
            href="/gear"
            target="_blank"
            rel="noreferrer"
            className="text-xs font-bold tracking-widest uppercase transition-opacity hover:opacity-50"
          >
            {"[ view live ↗ ]"}
          </Link>
        </div>
      </header>

      {/* Until the first save creates the row, prefill with the defaults the
          public page is currently serving, so editing starts from what is live. */}
      <GearForm
        gear={
          gear
            ? { year: gear.year, intro: gear.intro, groups: gear.groups }
            : DEFAULT_GEAR
        }
      />
    </div>
  )
}
