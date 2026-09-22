type Step = { id: string; label: string }

type StepperProps = {
  steps: Step[]
  current: number
  /** Permet de revenir à une étape déjà franchie. */
  onSelect?: (index: number) => void
}

/** Indicateur d'étapes d'un assistant ; l'étape courante porte `aria-current="step"`. */
export function Stepper({ steps, current, onSelect }: StepperProps) {
  return (
    <nav aria-label="Étapes de la demande">
      <ol className="stepper">
        {steps.map((step, index) => {
          const state = index < current ? 'done' : index === current ? 'current' : 'todo'
          const content = (
            <>
              <span className="stepper-index" aria-hidden="true">
                {index < current ? '✓' : index + 1}
              </span>
              <span className="stepper-label">
                {step.label}
                {state === 'done' && <span className="sr-only"> (terminée)</span>}
              </span>
            </>
          )

          return (
            <li key={step.id} className={`stepper-step ${state}`} aria-current={state === 'current' ? 'step' : undefined}>
              {onSelect && index < current ? (
                <button type="button" onClick={() => onSelect(index)}>
                  {content}
                </button>
              ) : (
                <span>{content}</span>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
