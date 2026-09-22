type StatusMessageProps = {
  tone: 'success' | 'error' | 'info'
  message?: string | null
  className?: string
}

/**
 * Région annoncée par les lecteurs d'écran (WCAG 4.1.3). Le conteneur reste rendu
 * même vide pour que le changement de contenu soit bien annoncé.
 */
export function StatusMessage({ tone, message, className }: StatusMessageProps) {
  const isError = tone === 'error'

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      className={className}
    >
      {message && <p className={`status-message ${tone}`}>{message}</p>}
    </div>
  )
}
