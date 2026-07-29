import type { ReactNode } from "react"

const inputClass =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 aria-invalid:border-destructive"

export function Field({
  label,
  hint,
  errors,
  children,
}: {
  label: string
  hint?: string
  errors?: string[]
  children: ReactNode
}) {
  return (
    <label className="flex flex-col gap-2">
      <span className="text-xs font-bold tracking-widest uppercase">
        {label}
      </span>
      {children}
      {hint && !errors?.length ? (
        <span className="text-xs text-muted-foreground">{hint}</span>
      ) : null}
      {errors?.length ? (
        <span role="alert" className="text-xs text-destructive">
          {errors.join(". ")}
        </span>
      ) : null}
    </label>
  )
}

export function TextInput({
  invalid,
  className = "",
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  return (
    <input
      {...props}
      aria-invalid={invalid || undefined}
      className={`${inputClass} h-10 ${className}`}
    />
  )
}

export function TextArea({
  invalid,
  className = "",
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) {
  return (
    <textarea
      {...props}
      aria-invalid={invalid || undefined}
      className={`${inputClass} min-h-24 resize-y ${className}`}
    />
  )
}

export function Select({
  invalid,
  className = "",
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { invalid?: boolean }) {
  return (
    <select
      {...props}
      aria-invalid={invalid || undefined}
      className={`${inputClass} h-10 ${className}`}
    />
  )
}

export function Checkbox({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex items-center gap-3">
      <input
        type="checkbox"
        {...props}
        className="size-4 rounded border-border accent-foreground"
      />
      <span className="text-xs font-bold tracking-widest uppercase">
        {label}
      </span>
    </label>
  )
}
