import { useState, type FormEvent } from 'react'
import {
  createAdminCampaign,
  getApiErrorMessage,
  updateAdminCampaign,
  type AcademicYear,
  type AdminCampaign,
  type CampaignPayload,
} from '../../lib/api'
import { closesAtFromLastDay, dayOf, lastDayOf, opensAtFromDay } from '../../lib/campaigns'
import { REQUEST_TYPE_LABELS } from '../../lib/scholarshipLabels'
import { Dialog } from '../ui/Dialog'
import { SelectField, TextField } from '../ui/fields'
import { StatusMessage } from '../ui/StatusMessage'

type CampaignFormDialogProps = {
  open: boolean
  /** Campagne modifiée ; absente pour une création. */
  campaign: AdminCampaign | null
  campaigns: AdminCampaign[]
  years: AcademicYear[]
  onSaved: (message: string) => void
  onCancel: () => void
}

type Form = {
  type: string
  academicYearId: string
  title: string
  instructions: string
  firstDay: string
  lastDay: string
  maxAge: string
  copyFrom: string
}

const initialForm = (campaign: AdminCampaign | null, campaigns: AdminCampaign[], years: AcademicYear[]): Form =>
  campaign
    ? {
        type: campaign.type,
        academicYearId: campaign.academicYear.id,
        title: campaign.title,
        instructions: campaign.instructions ?? '',
        firstDay: dayOf(campaign.opensAt),
        lastDay: dayOf(lastDayOf(campaign)),
        maxAge: campaign.maxAgeNonDoctoral?.toString() ?? '',
        copyFrom: '',
      }
    : {
        type: 'RENEWAL',
        academicYearId: years.find((year) => year.isCurrent)?.id ?? years[0]?.id ?? '',
        title: '',
        instructions: '',
        firstDay: '',
        lastDay: '',
        maxAge: '',
        copyFrom: campaigns.find((item) => item.type === 'RENEWAL')?.id ?? '',
      }

/**
 * Création ou modification d'une campagne (SUPER_ADMIN). Les pièces d'une nouvelle campagne
 * sont reprises d'une campagne existante du même type : le catalogue varie peu d'une année à l'autre.
 */
export function CampaignFormDialog({ open, campaign, campaigns, years, onSaved, onCancel }: CampaignFormDialogProps) {
  const [form, setForm] = useState<Form>(() => initialForm(campaign, campaigns, years))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const sameType = campaigns.filter((item) => item.type === form.type)

  const set = (key: keyof Form) => (value: string) =>
    setForm((current) => ({
      ...current,
      [key]: value,
      // Changer de type propose les pièces de la dernière campagne de ce type.
      ...(key === 'type' ? { copyFrom: campaigns.find((item) => item.type === value)?.id ?? '' } : {}),
    }))

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (form.lastDay < form.firstDay) {
      setError('Le dernier jour doit suivre le premier jour.')
      return
    }

    const common = {
      title: form.title.trim(),
      instructions: form.instructions.trim() || undefined,
      opensAt: opensAtFromDay(form.firstDay),
      closesAt: closesAtFromLastDay(form.lastDay),
      maxAgeNonDoctoral: form.maxAge ? Number(form.maxAge) : undefined,
    }

    setBusy(true)
    setError(null)

    try {
      if (campaign) {
        await updateAdminCampaign(campaign.id, common)
        onSaved(`Campagne « ${common.title} » modifiée.`)
      } else {
        const source = campaigns.find((item) => item.id === form.copyFrom)
        const payload: CampaignPayload = {
          ...common,
          type: form.type as CampaignPayload['type'],
          academicYearId: form.academicYearId,
          requirements: (source?.requirements ?? []).map(({ documentTypeCode, cycles, isRequired }) => ({
            documentTypeCode,
            cycles,
            isRequired,
          })),
        }

        await createAdminCampaign(payload)
        onSaved(`Campagne « ${common.title} » créée.`)
      }
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Enregistrement impossible.'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} title={campaign ? 'Modifier la campagne' : 'Nouvelle campagne'} onClose={onCancel}>
      <form className="form-stack" onSubmit={submit}>
        {!campaign && (
          <>
            <SelectField name="type" label="Type" required value={form.type} onChange={set('type')}>
              {Object.entries(REQUEST_TYPE_LABELS).map(([code, label]) => (
                <option key={code} value={code}>
                  {label}
                </option>
              ))}
            </SelectField>
            <SelectField name="academicYearId" label="Année universitaire" required value={form.academicYearId} onChange={set('academicYearId')}>
              {years.map((year) => (
                <option key={year.id} value={year.id}>
                  {year.label}
                </option>
              ))}
            </SelectField>
          </>
        )}
        <TextField name="title" label="Titre" required value={form.title} onChange={set('title')} maxLength={120} />
        <TextField name="instructions" label="Consignes aux demandeurs" multiline value={form.instructions} onChange={set('instructions')} maxLength={2000} />
        <TextField name="firstDay" label="Premier jour" type="date" required value={form.firstDay} onChange={set('firstDay')} />
        <TextField name="lastDay" label="Dernier jour (inclus)" type="date" required value={form.lastDay} onChange={set('lastDay')} />
        <TextField
          name="maxAge"
          label="Âge maximum hors doctorat"
          type="number"
          inputMode="numeric"
          value={form.maxAge}
          onChange={set('maxAge')}
          hint="Laisser vide pour ne pas appliquer de limite (renouvellement)."
        />
        {!campaign && (
          <SelectField name="copyFrom" label="Pièces demandées" emptyLabel="Aucune pièce" value={form.copyFrom} onChange={set('copyFrom')} hint="Reprises de la campagne choisie.">
            {sameType.map((item) => (
              <option key={item.id} value={item.id}>
                Comme « {item.title} » ({item.requirements.length} pièce(s))
              </option>
            ))}
          </SelectField>
        )}
        <StatusMessage tone="error" message={error} />
        <div className="dialog-footer">
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
            Annuler
          </button>
          <button type="submit" className="btn btn-primary" disabled={busy}>
            {busy ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
