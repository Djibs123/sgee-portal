import { useEffect, useRef, useState } from 'react'
import {
  ApiError,
  getApiErrorMessage,
  submitRequest,
  updateRequest,
  type RequestSpace,
  type RequestUpdate,
  type RequestView,
  type SubmissionProblem,
} from '../../lib/api'
import { formatDateTime } from '../../lib/format'
import { ACADEMIC_RESULT_LABELS, REQUEST_FIELD_LABELS, STUDY_LEVEL_GROUPS } from '../../lib/studyLevels'
import { InfoItem, InfoList } from '../ui/InfoList'
import { StatusMessage } from '../ui/StatusMessage'
import { Stepper } from '../ui/Stepper'
import { CheckboxField, SelectField, TextField } from '../ui/fields'
import { RequestDocuments } from './RequestDocuments'

type Draft = {
  targetLevel: string
  institution: string
  city: string
  country: string
  fieldOfStudy: string
  programName: string
  previousLevel: string
  previousResult: string
  previousAverage: string
  changedField: boolean
  changedInstitution: boolean
  baccalaureateSeries: string
  baccalaureateYear: string
  baccalaureateMention: string
  baccalaureateAverage: string
  motivation: string
}

type TextKey = Exclude<keyof Draft, 'changedField' | 'changedInstitution'>

const toDraft = (request: RequestView): Draft => ({
  targetLevel: request.targetLevel ?? '',
  institution: request.institution ?? '',
  city: request.city ?? '',
  country: request.country ?? '',
  fieldOfStudy: request.fieldOfStudy ?? '',
  programName: request.programName ?? '',
  previousLevel: request.previousLevel ?? '',
  previousResult: request.previousResult ?? '',
  previousAverage: request.previousAverage ?? '',
  changedField: request.changedField,
  changedInstitution: request.changedInstitution,
  baccalaureateSeries: request.baccalaureateSeries ?? '',
  baccalaureateYear: request.baccalaureateYear?.toString() ?? '',
  baccalaureateMention: request.baccalaureateMention ?? '',
  baccalaureateAverage: request.baccalaureateAverage ?? '',
  motivation: request.motivation ?? '',
})

const toNumber = (value: string) => Number(value.replace(',', '.'))

/** Seuls les champs modifiés et renseignés sont envoyés (l'API ignore les autres types). */
function toUpdate(draft: Draft, request: RequestView): RequestUpdate {
  const initial = toDraft(request)
  const update: Record<string, unknown> = {}

  for (const key of Object.keys(draft) as Array<keyof Draft>) {
    const value = draft[key]

    if (value === initial[key] || value === '') {
      continue
    }

    update[key] =
      key === 'previousAverage' || key === 'baccalaureateAverage' || key === 'baccalaureateYear'
        ? toNumber(value as string)
        : value
  }

  return update as RequestUpdate
}

type Step = { id: 'target' | 'previous' | 'profile' | 'documents' | 'review'; label: string; required: TextKey[] }

const STEPS: Record<RequestView['type'], Step[]> = {
  RENEWAL: [
    { id: 'target', label: 'Année demandée', required: ['targetLevel', 'institution', 'country', 'fieldOfStudy'] },
    { id: 'previous', label: 'Année précédente', required: ['previousLevel', 'previousResult'] },
    { id: 'documents', label: 'Pièces justificatives', required: [] },
    { id: 'review', label: 'Vérification et envoi', required: [] },
  ],
  NEW_APPLICATION: [
    { id: 'target', label: 'Formation visée', required: ['targetLevel', 'institution', 'country', 'fieldOfStudy'] },
    { id: 'profile', label: 'Baccalauréat et motivation', required: [] },
    { id: 'documents', label: 'Pièces justificatives', required: [] },
    { id: 'review', label: 'Vérification et envoi', required: [] },
  ],
}

type RequestWizardProps = {
  space: RequestSpace
  request: RequestView
  onChange: (request: RequestView) => void
  onWithdraw: () => void
}

export function RequestWizard({ space, request, onChange, onWithdraw }: RequestWizardProps) {
  const steps = STEPS[request.type]
  const [stepIndex, setStepIndex] = useState(0)
  const [draft, setDraft] = useState<Draft>(() => toDraft(request))
  const [errors, setErrors] = useState<Partial<Record<TextKey, string>>>({})
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [message, setMessage] = useState<{ tone: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [problem, setProblem] = useState<SubmissionProblem | null>(null)
  const [honor, setHonor] = useState(false)
  const [invalidAttempt, setInvalidAttempt] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const formRef = useRef<HTMLElement>(null)
  const firstRender = useRef(true)
  const step = steps[stepIndex]
  const infoRequest = [...request.history].reverse().find((entry) => entry.toStatus === 'INCOMPLETE')

  // À chaque étape, le focus va au titre : le lecteur d'écran annonce le nouveau contenu.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }

    headingRef.current?.focus()
  }, [stepIndex])

  // Après une validation refusée, le focus va au premier champ en erreur (une fois rendu).
  useEffect(() => {
    if (invalidAttempt > 0) {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
    }
  }, [invalidAttempt])

  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const save = async (): Promise<RequestView | null> => {
    const update = toUpdate(draft, request)

    if (Object.keys(update).length === 0) {
      return request
    }

    setSaving(true)

    try {
      const next = await updateRequest(space, request.id, { ...update, version: request.version })

      onChange(next)
      setDraft(toDraft(next))
      setSavedAt(new Date())

      return next
    } catch (reason) {
      setMessage({
        tone: 'error',
        text:
          reason instanceof ApiError && reason.status === 409
            ? 'La demande a été modifiée entre-temps (autre onglet ?). Rechargez la page pour continuer.'
            : getApiErrorMessage(reason, 'Enregistrement impossible.'),
      })

      return null
    } finally {
      setSaving(false)
    }
  }

  const goTo = async (index: number) => {
    setMessage(null)

    if (index > stepIndex) {
      const missing = step.required.filter((key) => draft[key].trim() === '')

      if (missing.length > 0) {
        setErrors(Object.fromEntries(missing.map((key) => [key, 'Ce champ est obligatoire.'])))
        setMessage({ tone: 'error', text: `Complétez : ${missing.map((key) => REQUEST_FIELD_LABELS[key] ?? key).join(', ')}.` })
        setInvalidAttempt((count) => count + 1)
        return
      }
    }

    if (await save()) {
      setStepIndex(index)
    }
  }

  const submit = async () => {
    setMessage(null)
    setProblem(null)

    const saved = await save()

    if (!saved) {
      return
    }

    setSaving(true)

    try {
      onChange(await submitRequest(space, request.id))
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 422) {
        setProblem(reason.responseBody as SubmissionProblem)
      } else {
        setMessage({ tone: 'error', text: getApiErrorMessage(reason, 'Envoi impossible.') })
      }
    } finally {
      setSaving(false)
    }
  }

  const blockers = request.eligibility?.blockers ?? []
  const warnings = request.eligibility?.warnings ?? []

  return (
    <section ref={formRef} className="card wizard" aria-labelledby="wizard-step-title">
      <p className="wizard-reference">
        Demande {request.reference} – {request.campaign.title} – <strong>{request.statusLabel}</strong>
      </p>

      {infoRequest?.comment && request.status === 'INCOMPLETE' && (
        <div className="alert warning">
          <div>
            <span className="alert-title">Complément demandé par le SGEE</span>
            {infoRequest.comment}
          </div>
        </div>
      )}

      <Stepper steps={steps} current={stepIndex} onSelect={(index) => void goTo(index)} />

      <h2 id="wizard-step-title" ref={headingRef} tabIndex={-1} className="wizard-title">
        Étape {stepIndex + 1} sur {steps.length} : {step.label}
      </h2>

      {step.id === 'target' && (
        <div className="form-grid">
          <SelectField name="targetLevel" label="Niveau demandé" required value={draft.targetLevel} onChange={set('targetLevel')} error={errors.targetLevel}>
            {STUDY_LEVEL_GROUPS.map((group) => (
              <optgroup key={group.cycle} label={group.cycle}>
                {group.levels.map((level) => (
                  <option key={level.code} value={level.code}>
                    {level.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </SelectField>
          <TextField name="institution" label="Établissement" required value={draft.institution} onChange={set('institution')} error={errors.institution} />
          <TextField name="fieldOfStudy" label="Filière" required value={draft.fieldOfStudy} onChange={set('fieldOfStudy')} error={errors.fieldOfStudy} />
          <TextField name="programName" label="Intitulé de la formation" value={draft.programName} onChange={set('programName')} />
          <TextField name="city" label="Ville" value={draft.city} onChange={set('city')} />
          <TextField name="country" label="Pays" required value={draft.country} onChange={set('country')} error={errors.country} />
          {request.type === 'RENEWAL' && (
            <>
              <CheckboxField name="changedInstitution" label="J’ai changé d’établissement" checked={draft.changedInstitution} onChange={set('changedInstitution')} />
              <CheckboxField name="changedField" label="J’ai changé de filière" checked={draft.changedField} onChange={set('changedField')} />
            </>
          )}
        </div>
      )}

      {step.id === 'previous' && (
        <div className="form-grid">
          <SelectField name="previousLevel" label="Niveau de l’année précédente" required value={draft.previousLevel} onChange={set('previousLevel')} error={errors.previousLevel}>
            {STUDY_LEVEL_GROUPS.flatMap((group) => group.levels).map((level) => (
              <option key={level.code} value={level.code}>
                {level.label}
              </option>
            ))}
          </SelectField>
          <SelectField name="previousResult" label="Résultat" required value={draft.previousResult} onChange={set('previousResult')} error={errors.previousResult}>
            {Object.entries(ACADEMIC_RESULT_LABELS).map(([code, label]) => (
              <option key={code} value={code}>
                {label}
              </option>
            ))}
          </SelectField>
          <TextField name="previousAverage" label="Moyenne annuelle (sur 20)" inputMode="decimal" value={draft.previousAverage} onChange={set('previousAverage')} hint="Facultatif, par exemple 12,5" />
        </div>
      )}

      {step.id === 'profile' && (
        <div className="form-grid">
          <TextField name="baccalaureateSeries" label="Série du baccalauréat" value={draft.baccalaureateSeries} onChange={set('baccalaureateSeries')} hint="Par exemple S1, S2, L2" />
          <TextField name="baccalaureateYear" label="Année d’obtention" inputMode="numeric" value={draft.baccalaureateYear} onChange={set('baccalaureateYear')} />
          <TextField name="baccalaureateMention" label="Mention" value={draft.baccalaureateMention} onChange={set('baccalaureateMention')} />
          <TextField name="baccalaureateAverage" label="Moyenne au baccalauréat (sur 20)" inputMode="decimal" value={draft.baccalaureateAverage} onChange={set('baccalaureateAverage')} />
          <TextField name="motivation" label="Projet d’études et motivation" multiline value={draft.motivation} onChange={set('motivation')} hint="Entre 20 et 2 000 caractères." />
        </div>
      )}

      {step.id === 'documents' && <RequestDocuments space={space} request={request} onChange={onChange} />}

      {step.id === 'review' && (
        <div className="wizard-review">
          <InfoList>
            <InfoItem label="Niveau demandé">{request.targetLevelLabel}</InfoItem>
            <InfoItem label="Établissement">{request.institution}</InfoItem>
            <InfoItem label="Filière">{request.fieldOfStudy}</InfoItem>
            <InfoItem label="Lieu">{[request.city, request.country].filter(Boolean).join(', ')}</InfoItem>
            {request.type === 'RENEWAL' ? (
              <>
                <InfoItem label="Année précédente">{request.previousLevelLabel}</InfoItem>
                <InfoItem label="Résultat">{request.previousResult ? ACADEMIC_RESULT_LABELS[request.previousResult] : null}</InfoItem>
              </>
            ) : (
              <>
                <InfoItem label="Baccalauréat">
                  {[request.baccalaureateSeries, request.baccalaureateYear, request.baccalaureateMention].filter(Boolean).join(' – ')}
                </InfoItem>
              </>
            )}
            <InfoItem label="Pièces déposées">
              {request.documents.filter((document) => document.isDownloadable).length} sur {request.documents.length}
            </InfoItem>
          </InfoList>

          {blockers.length > 0 && (
            <div className="alert warning">
              <div>
                <span className="alert-title">Envoi impossible</span>
                <ul>
                  {blockers.map((issue) => (
                    <li key={issue.code}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {warnings.length > 0 && (
            <div className="alert info">
              <div>
                <span className="alert-title">Points qui seront examinés par le SGEE</span>
                <ul>
                  {warnings.map((issue) => (
                    <li key={issue.code}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {problem && (
            <div className="alert warning" role="alert">
              <div>
                <span className="alert-title">{problem.message}</span>
                <ul>
                  {problem.missingFields?.map((field) => (
                    <li key={field}>Champ manquant : {REQUEST_FIELD_LABELS[field] ?? field}</li>
                  ))}
                  {problem.missingDocuments?.map((document) => (
                    <li key={document.documentTypeCode}>Pièce manquante : {document.label}</li>
                  ))}
                  {problem.blockers?.map((issue) => (
                    <li key={issue.code}>{issue.message}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          <CheckboxField
            name="honor"
            label="J’atteste sur l’honneur l’exactitude des informations et des pièces fournies."
            checked={honor}
            onChange={setHonor}
          />
        </div>
      )}

      <StatusMessage tone={message?.tone ?? 'info'} message={message?.text} />
      <p className="wizard-saved" role="status">
        {saving ? 'Enregistrement…' : savedAt ? `Brouillon enregistré à ${formatDateTime(savedAt)}` : ''}
      </p>

      <div className="wizard-actions">
        {stepIndex > 0 && (
          <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void goTo(stepIndex - 1)}>
            Étape précédente
          </button>
        )}
        {step.id !== 'review' ? (
          <button type="button" className="btn btn-primary" disabled={saving} onClick={() => void goTo(stepIndex + 1)}>
            Enregistrer et continuer
          </button>
        ) : (
          <button type="button" className="btn btn-primary" disabled={saving || !honor || blockers.length > 0} onClick={() => void submit()}>
            {request.status === 'INCOMPLETE' ? 'Renvoyer ma demande' : 'Envoyer ma demande'}
          </button>
        )}
        <button type="button" className="btn btn-secondary" disabled={saving} onClick={() => void save()}>
          Enregistrer le brouillon
        </button>
        <button type="button" className="btn btn-secondary" onClick={onWithdraw}>
          Retirer ma demande
        </button>
      </div>
    </section>
  )
}
