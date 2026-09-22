import { useCallback, useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { InlineState } from '../../components/InlineState'
import { CheckboxField, SelectField, TextField } from '../../components/ui/fields'
import { EmptyState } from '../../components/ui/EmptyState'
import { Pagination } from '../../components/ui/Pagination'
import { StatusPill } from '../../components/ui/StatusPill'
import { listAdminCampaigns, listAdminRequests, type AdminRequestFilters } from '../../lib/api'
import { formatDate } from '../../lib/format'
import { REQUEST_TYPE_LABELS, REVIEWABLE_STATUS_LABELS, STUDY_LEVEL_GROUPS } from '../../lib/scholarshipLabels'
import { toneOfStatus } from '../../lib/status'
import { useApiResource } from '../../lib/useApiResource'
import { useDocumentTitle } from '../../lib/useDocumentTitle'

const PAGE_SIZE = 20
const FILTER_KEYS = ['type', 'status', 'campaignId', 'targetLevel', 'search'] as const

type FilterForm = Record<(typeof FILTER_KEYS)[number], string> & { hasWarnings: boolean }

const formFrom = (params: URLSearchParams): FilterForm => ({
  type: params.get('type') ?? '',
  status: params.get('status') ?? '',
  campaignId: params.get('campaignId') ?? '',
  targetLevel: params.get('targetLevel') ?? '',
  search: params.get('search') ?? '',
  hasWarnings: params.get('hasWarnings') === 'true',
})

const filtersFrom = (params: URLSearchParams): AdminRequestFilters => ({
  ...formFrom(params),
  page: Math.max(1, Number(params.get('page')) || 1),
  pageSize: PAGE_SIZE,
})

/** File d'instruction : filtres dans l'URL (partageables, bouton Précédent), plus anciennes d'abord. */
export function AdminRequestsPage() {
  useDocumentTitle('Demandes')

  const [searchParams, setSearchParams] = useSearchParams()
  const query = searchParams.toString()
  const load = useCallback(() => listAdminRequests(filtersFrom(new URLSearchParams(query))), [query])
  const { data, loading, error } = useApiResource(load)
  const filterKey = FILTER_KEYS.map((key) => searchParams.get(key) ?? '').join('|') + searchParams.get('hasWarnings')

  const goToPage = (page: number) => {
    const next = new URLSearchParams(searchParams)

    next.set('page', String(page))
    setSearchParams(next)
  }

  return (
    <div>
      <div className="admin-page-title">
        <h1>Demandes de bourse</h1>
        <p>Renouvellements et candidatures soumis, des plus anciens aux plus récents.</p>
      </div>

      {/* Remonté quand les filtres de l'URL changent (menu, lien d'un tableau de bord) : le formulaire reste fidèle à l'URL. */}
      <FilterPanel key={filterKey} initial={formFrom(searchParams)} onApply={setSearchParams} />

      <InlineState loading={loading && !data} error={data ? null : error} />

      {data && data.items.length === 0 && <EmptyState title="Aucune demande" description="Aucune demande ne correspond à ces critères." />}

      {data && data.items.length > 0 && (
        <section className="admin-card">
          <div className="table-wrapper">
            <table className="data-table">
              <caption>
                {data.total} demande(s){loading ? ' – actualisation…' : ''}
              </caption>
              <thead>
                <tr>
                  <th scope="col">Référence</th>
                  <th scope="col">Demandeur</th>
                  <th scope="col">Type</th>
                  <th scope="col">Niveau demandé</th>
                  <th scope="col">Statut</th>
                  <th scope="col">Alertes</th>
                  <th scope="col">Soumise le</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((request) => (
                  <tr key={request.id}>
                    <th scope="row">
                      <Link to={`/admin/demandes/${request.id}`}>{request.reference}</Link>
                    </th>
                    <td>
                      {request.owner.name}
                      <br />
                      <small>{request.owner.studentNumber ?? 'Candidat'}</small>
                    </td>
                    <td>{REQUEST_TYPE_LABELS[request.type]}</td>
                    <td>{request.targetLevelLabel ?? '—'}</td>
                    <td>
                      <StatusPill tone={toneOfStatus(request.status)}>{request.statusLabel}</StatusPill>
                    </td>
                    <td>{request.warningCount > 0 ? <StatusPill tone="warning">{request.warningCount}</StatusPill> : '—'}</td>
                    <td>{formatDate(request.submittedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={data.page} pageSize={data.pageSize} total={data.total} onChange={goToPage} label="Pages de demandes" />
        </section>
      )}
    </div>
  )
}

function FilterPanel({ initial, onApply }: { initial: FilterForm; onApply: (params: URLSearchParams) => void }) {
  const campaigns = useApiResource(listAdminCampaigns)
  const [form, setForm] = useState<FilterForm>(initial)
  const [searchError, setSearchError] = useState<string | null>(null)

  const set = <K extends keyof FilterForm>(key: K) => (value: FilterForm[K]) =>
    setForm((current) => ({ ...current, [key]: value }))

  const apply = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const search = form.search.trim()

    if (search.length === 1) {
      setSearchError('Saisissez au moins 2 caractères.')
      return
    }

    setSearchError(null)

    const next = new URLSearchParams()

    for (const key of FILTER_KEYS) {
      const value = key === 'search' ? search : form[key]

      if (value) {
        next.set(key, value)
      }
    }

    if (form.hasWarnings) {
      next.set('hasWarnings', 'true')
    }

    onApply(next)
  }

  const reset = () => {
    setForm(formFrom(new URLSearchParams()))
    setSearchError(null)
    onApply(new URLSearchParams())
  }

  return (
    <form className="admin-card admin-filters" onSubmit={apply} aria-label="Filtrer les demandes">
      <div className="form-grid">
        <TextField name="search" label="Recherche" value={form.search} onChange={set('search')} error={searchError} hint="Référence, nom, e-mail ou numéro boursier" />
        <SelectField name="type" label="Type" emptyLabel="Tous" value={form.type} onChange={set('type')}>
          {Object.entries(REQUEST_TYPE_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField name="status" label="Statut" emptyLabel="Tous" value={form.status} onChange={set('status')}>
          {Object.entries(REVIEWABLE_STATUS_LABELS).map(([code, label]) => (
            <option key={code} value={code}>
              {label}
            </option>
          ))}
        </SelectField>
        <SelectField name="campaignId" label="Campagne" emptyLabel="Toutes" value={form.campaignId} onChange={set('campaignId')}>
          {(campaigns.data?.items ?? []).map((campaign) => (
            <option key={campaign.id} value={campaign.id}>
              {campaign.title}
            </option>
          ))}
        </SelectField>
        <SelectField name="targetLevel" label="Niveau demandé" emptyLabel="Tous" value={form.targetLevel} onChange={set('targetLevel')}>
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
      </div>
      <div className="admin-filters-actions">
        <CheckboxField name="hasWarnings" label="Avec alertes uniquement" checked={form.hasWarnings} onChange={set('hasWarnings')} />
        <button type="submit" className="btn btn-primary">
          Filtrer
        </button>
        <button type="button" className="btn btn-secondary" onClick={reset}>
          Réinitialiser
        </button>
      </div>
    </form>
  )
}
