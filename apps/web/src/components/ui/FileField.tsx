import { useId, type ChangeEvent } from 'react'
import { ACCEPTED_FILE_TYPES } from '../../lib/files'

type FileFieldProps = {
  label: string
  onChange: (file: File | null) => void
  error?: string | null
  disabled?: boolean
}

export function FileField({ label, onChange, error, disabled }: FileFieldProps) {
  const inputId = useId()
  const hintId = useId()
  const errorId = useId()

  return (
    <div className="field">
      <label htmlFor={inputId}>{label}</label>
      <input
        id={inputId}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        disabled={disabled}
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        aria-invalid={error ? true : undefined}
        onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(event.target.files?.[0] ?? null)}
      />
      <small id={hintId}>PDF, PNG ou JPEG, 5 Mo maximum.</small>
      {error && (
        <p id={errorId} className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
