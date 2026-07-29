"use client"

import { useActionState } from "react"

import {
  createCategory,
  updateCategory,
  type ActionResult,
} from "@/app/admin/actions"
import { Checkbox, Field, TextArea, TextInput } from "@/components/admin/field"
import { Button } from "@/components/ui/button"

type CategoryFormValues = {
  id: string
  slug: string
  name: string
  year: string
  intro: string
  published: boolean
}

export function CategoryForm({ category }: { category?: CategoryFormValues }) {
  const action = category
    ? updateCategory.bind(null, category.id)
    : createCategory

  const [state, formAction, pending] = useActionState<
    ActionResult | null,
    FormData
  >(action, null)

  const errors = state && !state.ok ? state.fieldErrors : undefined

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <Field label="Name" errors={errors?.name}>
        <TextInput
          name="name"
          required
          maxLength={60}
          defaultValue={category?.name}
          placeholder="streets"
          invalid={!!errors?.name}
        />
      </Field>

      <Field
        label="Slug"
        hint="The public URL, e.g. /streets. Changing it breaks existing links."
        errors={errors?.slug}
      >
        <TextInput
          name="slug"
          required
          maxLength={60}
          defaultValue={category?.slug}
          placeholder="streets"
          pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
          invalid={!!errors?.slug}
        />
      </Field>

      <Field label="Year" errors={errors?.year}>
        <TextInput
          name="year"
          required
          inputMode="numeric"
          pattern="\d{4}"
          maxLength={4}
          defaultValue={category?.year ?? String(new Date().getFullYear())}
          invalid={!!errors?.year}
        />
      </Field>

      <Field
        label="Intro"
        hint="Shown beside the collection title."
        errors={errors?.intro}
      >
        <TextArea
          name="intro"
          rows={5}
          maxLength={2000}
          defaultValue={category?.intro}
          invalid={!!errors?.intro}
        />
      </Field>

      <Checkbox
        name="published"
        label="Published"
        defaultChecked={category?.published ?? true}
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
          {pending
            ? "Saving…"
            : category
              ? "Save Changes"
              : "Create Collection"}
        </Button>
      </div>
    </form>
  )
}
