import { useEffect, useId, useRef, type ReactNode } from 'react'

type DialogProps = {
  open: boolean
  title: string
  description?: string
  onClose: () => void
  children?: ReactNode
  footer?: ReactNode
}

/**
 * Boîte de dialogue modale sur l'élément natif `<dialog>` : le navigateur piège le
 * focus et gère Échap ; le focus revient à l'élément déclencheur à la fermeture.
 */
export function Dialog({ open, title, description, onClose, children, footer }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const returnFocusRef = useRef<Element | null>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = dialogRef.current

    if (!dialog) {
      return
    }

    if (open && !dialog.open) {
      returnFocusRef.current = document.activeElement
      dialog.showModal()
    } else if (!open && dialog.open) {
      dialog.close()
    }
  }, [open])

  const handleClose = () => {
    if (returnFocusRef.current instanceof HTMLElement) {
      returnFocusRef.current.focus()
    }

    if (open) {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="dialog"
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      onClose={handleClose}
    >
      <div className="dialog-header">
        <h2 id={titleId}>{title}</h2>
        <button type="button" className="dialog-close" onClick={onClose} aria-label="Fermer">
          <span aria-hidden="true">×</span>
        </button>
      </div>
      {description && (
        <p id={descriptionId} className="dialog-description">
          {description}
        </p>
      )}
      {children && <div className="dialog-body">{children}</div>}
      {footer && <div className="dialog-footer">{footer}</div>}
    </dialog>
  )
}
