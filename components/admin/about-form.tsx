"use client"

import { useActionState, useState } from "react"

import { updateAbout, type ActionResult } from "@/app/admin/actions"
import { Field, Select, TextArea, TextInput } from "@/components/admin/field"
import { Button } from "@/components/ui/button"

type AboutValues = {
  year: string
  paragraphs: string[]
  links: { label: string; href: string }[]
  heroPhotoId: string | null
}

type PhotoOption = {
  id: string
  label: string
  thumbUrl: string
}

export function AboutForm({
  about,
  photoOptions,
}: {
  about: AboutValues | null
  photoOptions: PhotoOption[]
}) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updateAbout, null)

  // Links are a variable-length list, so the row count is client state. The
  // values themselves stay uncontrolled and are read from FormData on submit.
  const [links, setLinks] = useState(
    about?.links.length ? about.links : [{ label: "", href: "" }],
  )

  const errors = state && !state.ok ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="flex flex-col gap-8">
      <Field label="Year" errors={errors?.year}>
        <TextInput
          name="year"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          defaultValue={about?.year ?? String(new Date().getFullYear())}
          invalid={!!errors?.year}
          className="max-w-32"
        />
      </Field>

      <Field
        label="Body"
        hint="Separate paragraphs with a blank line. The first paragraph renders larger, as the lead."
        errors={errors?.paragraphs}
      >
        <TextArea
          name="paragraphs"
          rows={16}
          defaultValue={about?.paragraphs.join("\n\n") ?? ""}
          invalid={!!errors?.paragraphs}
          className="font-mono text-xs leading-relaxed"
        />
      </Field>

      <Field
        label="Hero photo"
        hint="Shown beside the body text. Leave empty for a full-width text layout."
        errors={errors?.heroPhotoId}
      >
        <Select name="heroPhotoId" defaultValue={about?.heroPhotoId ?? ""}>
          <option value="">No photo</option>
          {photoOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </Select>
      </Field>

      <fieldset className="flex flex-col gap-4">
        <legend className="text-xs font-bold tracking-widest uppercase">
          Elsewhere links
        </legend>

        {errors?.links ? (
          <p role="alert" className="text-xs text-destructive">
            {errors.links.join(". ")}
          </p>
        ) : null}

        {links.map((link, index) => (
          <div key={index} className="flex flex-wrap items-end gap-3">
            <label className="flex flex-1 flex-col gap-1">
              <span className="text-xs text-muted-foreground">Label</span>
              <TextInput
                name="linkLabel"
                defaultValue={link.label}
                maxLength={60}
                placeholder="TUSHGAURAV.COM"
              />
            </label>
            <label className="flex flex-[2] flex-col gap-1">
              <span className="text-xs text-muted-foreground">URL</span>
              <TextInput
                name="linkHref"
                type="url"
                defaultValue={link.href}
                placeholder="https://www.tushgaurav.com"
              />
            </label>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setLinks(links.filter((_, i) => i !== index))}
              aria-label={`Remove link ${index + 1}`}
            >
              Remove
            </Button>
          </div>
        ))}

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLinks([...links, { label: "", href: "" }])}
          >
            Add link
          </Button>
        </div>
      </fieldset>

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
          {pending ? "Saving…" : "Save changes"}
        </Button>
      </div>
    </form>
  )
}
