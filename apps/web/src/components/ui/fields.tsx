import { useId, type ReactNode } from 'react'

type BaseProps = {
  label: string
  error?: string | null
  hint?: string
  required?: boolean
}

function describedBy(hintId: string, errorId: string, hint?: string, error?: string | null) {
  return [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(' ') || undefined
}

function FieldMessages({ hint, hintId, error, errorId }: { hint?: string; hintId: string; error?: string | null; errorId: string }) {
  return (
    <>
      {hint && <small id={hintId}>{hint}</small>}
      {error && (
        <p id={errorId} className="field-error">
          {error}
        </p>
      )}
    </>
  )
}

const requiredMark = (required?: boolean) =>
  required ? (
    <>
      {' '}
      <span aria-hidden="true">*</span>
    </>
  ) : null

export function TextField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  type = 'text',
  multiline = false,
  inputMode,
  name,
  autoComplete,
  minLength,
  maxLength,
}: BaseProps & {
  value: string
  onChange: (value: string) => void
  type?: 'text' | 'number' | 'email' | 'password' | 'date' | 'tel'
  multiline?: boolean
  inputMode?: 'decimal' | 'numeric' | 'text'
  name: string
  autoComplete?: string
  minLength?: number
  maxLength?: number
}) {
  const id = useId()
  const hintId = useId()
  const errorId = useId()
  const common = {
    id,
    name,
    value,
    required,
    autoComplete,
    minLength,
    maxLength,
    'aria-invalid': error ? true : undefined,
    'aria-describedby': describedBy(hintId, errorId, hint, error),
  }

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {requiredMark(required)}
      </label>
      {multiline ? (
        <textarea {...common} rows={5} onChange={(event) => onChange(event.target.value)} />
      ) : (
        <input {...common} type={type} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} />
      )}
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  )
}

export function SelectField({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  name,
  children,
  emptyLabel = 'Choisir…',
}: BaseProps & {
  value: string
  onChange: (value: string) => void
  name: string
  children: ReactNode
  /** Libellé de l'option vide (« Tous » pour un filtre). */
  emptyLabel?: string
}) {
  const id = useId()
  const hintId = useId()
  const errorId = useId()

  return (
    <div className="field">
      <label htmlFor={id}>
        {label}
        {requiredMark(required)}
      </label>
      <select
        id={id}
        name={name}
        value={value}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(hintId, errorId, hint, error)}
        onChange={(event) => onChange(event.target.value)}
      >
        <option value="">{emptyLabel}</option>
        {children}
      </select>
      <FieldMessages hint={hint} hintId={hintId} error={error} errorId={errorId} />
    </div>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
  name,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
  name: string
}) {
  const id = useId()

  return (
    <div className="checkbox">
      <input id={id} name={name} type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
      <label htmlFor={id}>{label}</label>
    </div>
  )
}
