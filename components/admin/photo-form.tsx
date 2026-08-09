"use client"

import { useActionState, useState } from "react"

import {
  generatePhotoMeta,
  updatePhoto,
  type ActionResult,
} from "@/app/admin/actions"
import {
  Checkbox,
  Field,
  Select,
  TextArea,
  TextInput,
} from "@/components/admin/field"
import { Button } from "@/components/ui/button"
import type { AdminPhoto } from "@/lib/queries/admin"

export function PhotoForm({ photo }: { photo: AdminPhoto }) {
  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(updatePhoto.bind(null, photo.id), null)

  // Controlled so the AI draft can fill them; everything else stays uncontrolled.
  const [alt, setAlt] = useState(photo.alt)
  const [caption, setCaption] = useState(photo.caption ?? "")
  const [generating, setGenerating] = useState(false)
  const [generateError, setGenerateError] = useState<string | null>(null)

  async function handleGenerate() {
    setGenerating(true)
    setGenerateError(null)
    const result = await generatePhotoMeta(photo.id)
    if (result.ok) {
      setAlt(result.alt)
      setCaption(result.caption)
    } else {
      setGenerateError(result.error)
    }
    setGenerating(false)
  }

  const errors = state && !state.ok ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={generating}
          onClick={handleGenerate}
        >
          {generating ? "Generating…" : "Generate with AI"}
        </Button>
        <span className="text-xs text-muted-foreground">
          Drafts alt text and a caption. Nothing is saved until you do.
        </span>
      </div>

      {generateError ? (
        <p role="alert" className="-mt-4 text-xs text-destructive">
          {generateError}
        </p>
      ) : null}

      <Field
        label="Alt text"
        hint="Describes the image for screen readers. Required before publishing."
        errors={errors?.alt}
      >
        <TextArea
          name="alt"
          required
          rows={2}
          maxLength={300}
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          invalid={!!errors?.alt}
        />
      </Field>

      <Field
        label="Caption"
        hint="Optional. Shown beside the photo in left/right layouts only."
        errors={errors?.caption}
      >
        <TextArea
          name="caption"
          rows={4}
          maxLength={2000}
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          invalid={!!errors?.caption}
        />
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
        <Field label="Location" errors={errors?.location}>
          <TextInput
            name="location"
            maxLength={200}
            defaultValue={photo.location ?? ""}
            placeholder="Chandni Chowk, Delhi"
            invalid={!!errors?.location}
          />
        </Field>

        <Field label="Year" errors={errors?.year}>
          <TextInput
            name="year"
            required
            inputMode="numeric"
            pattern="\d{4}"
            maxLength={4}
            defaultValue={photo.year}
            invalid={!!errors?.year}
          />
        </Field>
      </div>

      <Field
        label="Layout"
        hint="Full spans the page. Left and right place the image beside its caption."
        errors={errors?.layout}
      >
        <Select name="layout" defaultValue={photo.layout}>
          <option value="full">Full width</option>
          <option value="left">Image left, text right</option>
          <option value="right">Text left, image right</option>
        </Select>
      </Field>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <Field label="Camera" errors={errors?.camera}>
          <TextInput
            name="camera"
            maxLength={120}
            defaultValue={photo.camera}
            placeholder="FUJIFILM X-T4"
            invalid={!!errors?.camera}
          />
        </Field>

        <Field label="Lens" errors={errors?.lens}>
          <TextInput
            name="lens"
            maxLength={120}
            defaultValue={photo.lens}
            placeholder="23MM F/1.4"
            invalid={!!errors?.lens}
          />
        </Field>

        <Field label="Settings" errors={errors?.settings}>
          <TextInput
            name="settings"
            maxLength={120}
            defaultValue={photo.settings}
            placeholder="F/4 · 1/250S · ISO 800"
            invalid={!!errors?.settings}
          />
        </Field>
      </div>

      <Checkbox
        name="published"
        label="Published"
        defaultChecked={photo.published}
      />

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
