import { Dialog } from './Dialog'

type ConfirmDialogProps = {
  open: boolean
  title: string
  message: string
  confirmLabel: string
  /** `danger` pour une action destructrice (annulation, retrait). */
  tone?: 'default' | 'danger'
  busy?: boolean
  onConfirm: () => void
  onCancel: () => void
}

/** Remplace `window.confirm` : accessible, stylable et cohérent avec le reste de l'interface. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  tone = 'default',
  busy = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      title={title}
      description={message}
      onClose={onCancel}
      footer={
        <>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Retour
          </button>
          <button
            type="button"
            className={tone === 'danger' ? 'btn btn-danger' : 'btn btn-primary'}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? 'Traitement…' : confirmLabel}
          </button>
        </>
      }
    />
  )
}
