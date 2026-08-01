"use client"

import { useActionState, useState } from "react"

import { updateGear, type ActionResult } from "@/app/admin/actions"
import { Field, TextArea, TextInput } from "@/components/admin/field"
import { Button } from "@/components/ui/button"
import type { GearGroup } from "@/lib/db/schema"

type GearValues = {
  year: string
  intro: string
  groups: GearGroup[]
}

/**
 * Unlike the About form's flat link list, groups nest items, so the whole
 * structure lives in controlled state and is submitted as one JSON field that
 * the server action re-validates. Year and intro stay ordinary form fields.
 */
export function GearForm({ gear }: { gear: GearValues }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateGear, null)

  const [groups, setGroups] = useState<GearGroup[]>(gear.groups)

  const errors = state && !state.ok ? state.fieldErrors : undefined

  function patchGroup(index: number, patch: Partial<GearGroup>) {
    setGroups(groups.map((g, i) => (i === index ? { ...g, ...patch } : g)))
  }

  function patchItem(
    groupIndex: number,
    itemIndex: number,
    patch: Partial<GearGroup["items"][number]>,
  ) {
    patchGroup(groupIndex, {
      items: groups[groupIndex].items.map((item, i) =>
        i === itemIndex ? { ...item, ...patch } : item,
      ),
    })
  }

  function move<T>(list: T[], from: number, to: number): T[] {
    const next = [...list]
    const [entry] = next.splice(from, 1)
    next.splice(to, 0, entry)
    return next
  }

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <input type="hidden" name="groups" value={JSON.stringify(groups)} />

      <Field label="Year" errors={errors?.year}>
        <TextInput
          name="year"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          defaultValue={gear.year}
          invalid={!!errors?.year}
          className="max-w-32"
        />
      </Field>

      <Field label="Intro" errors={errors?.intro}>
        <TextArea
          name="intro"
          rows={4}
          defaultValue={gear.intro}
          invalid={!!errors?.intro}
        />
      </Field>

      {errors?.groups ? (
        <p role="alert" className="text-xs text-destructive">
          {errors.groups.join(". ")}
        </p>
      ) : null}

      <div className="flex flex-col gap-10">
        {groups.map((group, groupIndex) => (
          <fieldset
            key={groupIndex}
            className="flex flex-col gap-4 border border-border p-4 md:p-6"
          >
            <div className="flex flex-wrap items-end gap-3">
              <label className="flex flex-1 flex-col gap-1">
                <span className="text-xs font-bold tracking-widest uppercase">
                  Group title
                </span>
                <TextInput
                  required
                  maxLength={60}
                  value={group.title}
                  onChange={(e) =>
                    patchGroup(groupIndex, { title: e.target.value })
                  }
                  placeholder="Cameras"
                />
              </label>
              <div className="flex gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={groupIndex === 0}
                  onClick={() =>
                    setGroups(move(groups, groupIndex, groupIndex - 1))
                  }
                  aria-label={`Move group ${groupIndex + 1} up`}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={groupIndex === groups.length - 1}
                  onClick={() =>
                    setGroups(move(groups, groupIndex, groupIndex + 1))
                  }
                  aria-label={`Move group ${groupIndex + 1} down`}
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setGroups(groups.filter((_, i) => i !== groupIndex))
                  }
                  aria-label={`Remove group ${groupIndex + 1}`}
                >
                  Remove
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              {group.items.map((item, itemIndex) => (
                <div
                  key={itemIndex}
                  className="flex flex-wrap items-end gap-3 border-t border-border pt-3"
                >
                  <label className="flex min-w-40 flex-1 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Name</span>
                    <TextInput
                      required
                      maxLength={120}
                      value={item.name}
                      onChange={(e) =>
                        patchItem(groupIndex, itemIndex, {
                          name: e.target.value,
                        })
                      }
                      placeholder="35mm prime"
                    />
                  </label>
                  <label className="flex min-w-56 flex-[2] flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Note</span>
                    <TextInput
                      maxLength={300}
                      value={item.note}
                      onChange={(e) =>
                        patchItem(groupIndex, itemIndex, {
                          note: e.target.value,
                        })
                      }
                      placeholder="What it is for, in one line."
                    />
                  </label>
                  <label className="flex w-24 flex-col gap-1">
                    <span className="text-xs text-muted-foreground">Year</span>
                    <TextInput
                      required
                      inputMode="numeric"
                      pattern="\d{4}"
                      maxLength={4}
                      value={item.year}
                      onChange={(e) =>
                        patchItem(groupIndex, itemIndex, {
                          year: e.target.value,
                        })
                      }
                    />
                  </label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={itemIndex === 0}
                      onClick={() =>
                        patchGroup(groupIndex, {
                          items: move(group.items, itemIndex, itemIndex - 1),
                        })
                      }
                      aria-label={`Move item ${itemIndex + 1} up`}
                    >
                      ↑
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={itemIndex === group.items.length - 1}
                      onClick={() =>
                        patchGroup(groupIndex, {
                          items: move(group.items, itemIndex, itemIndex + 1),
                        })
                      }
                      aria-label={`Move item ${itemIndex + 1} down`}
                    >
                      ↓
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patchGroup(groupIndex, {
                          items: group.items.filter((_, i) => i !== itemIndex),
                        })
                      }
                      aria-label={`Remove item ${itemIndex + 1}`}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    patchGroup(groupIndex, {
                      items: [
                        ...group.items,
                        { name: "", note: "", year: gear.year },
                      ],
                    })
                  }
                >
                  Add item
                </Button>
              </div>
            </div>
          </fieldset>
        ))}
      </div>

      <div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setGroups([...groups, { title: "", items: [] }])}
        >
          Add group
        </Button>
      </div>

      {state && !state.ok ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      {state?.ok ? (
        <p role="status" className="text-sm text-muted-foreground">
          Saved.
        </p>
      ) : null}

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}
