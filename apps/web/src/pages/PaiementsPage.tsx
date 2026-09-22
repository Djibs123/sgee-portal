import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { EmptyState } from '../components/ui/EmptyState'
import { StatusPill } from '../components/ui/StatusPill'
import { getStudentPayments, type StudentPayment } from '../lib/api'
import { formatDate, formatMoney, sumAmounts } from '../lib/format'
import { toneOfStatus } from '../lib/status'
import { useApiResource } from '../lib/useApiResource'
import { useDocumentTitle } from '../lib/useDocumentTitle'

type YearGroup = {
  year: string
  payments: StudentPayment[]
  /** Totaux par devise : une année peut mélanger EUR et XOF. */
  totals: Array<{ currency: string; amount: number }>
}

function groupByYear(payments: StudentPayment[]): YearGroup[] {
  const groups = new Map<string, StudentPayment[]>()

  for (const payment of payments) {
    groups.set(payment.annee, [...(groups.get(payment.annee) ?? []), payment])
  }

  return [...groups.entries()]
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([year, items]) => {
      const paid = items.filter((payment) => payment.status === 'PAID')
      const currencies = [...new Set(paid.map((payment) => payment.devise))]

      return {
        year,
        payments: items,
        totals: currencies.map((currency) => ({
          currency,
          amount: sumAmounts(paid.filter((payment) => payment.devise === currency).map((payment) => payment.amount)),
        })),
      }
    })
}

const formatTotals = (totals: YearGroup['totals']) =>
  totals.length === 0 ? '—' : totals.map((total) => formatMoney(total.amount, total.currency)).join(' + ')

export function PaiementsPage() {
  useDocumentTitle('Paiements')

  const { data, loading, error } = useApiResource(getStudentPayments)
  const groups = groupByYear(data?.items ?? [])

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Paiements" />
        <h1>Historique des paiements</h1>
        <p>Versements effectués depuis l’attribution de votre bourse</p>
      </div>

      <InlineState loading={loading} error={error} />

      {data && groups.length === 0 && (
        <EmptyState title="Aucun versement" description="Les versements apparaîtront ici dès leur traitement." />
      )}

      {groups.length > 0 && (
        <section className="stat-grid" aria-label="Totaux par année" style={{ marginBottom: '24px' }}>
          {groups.slice(0, 3).map((group) => (
            <article key={group.year} className="card stat-card">
              <h2 className="stat-label">Total {group.year}</h2>
              <p className="stat-value">{formatTotals(group.totals)}</p>
              <p className="stat-sub">
                {group.payments.filter((payment) => payment.status === 'PAID').length} versement(s)
              </p>
            </article>
          ))}
        </section>
      )}

      {groups.map((group) => (
        <section key={group.year} className="payment-year-group" aria-labelledby={`year-${group.year}`}>
          <h2 id={`year-${group.year}`} className="payment-year-label">
            <span>Année universitaire {group.year}</span>
            <span>{formatTotals(group.totals)}</span>
          </h2>
          <div className="card table-wrapper" style={{ padding: 0 }}>
            <table className="payment-table">
              <caption className="sr-only">Versements de l’année universitaire {group.year}</caption>
              <thead>
                <tr>
                  <th scope="col">Mois</th>
                  <th scope="col">Date de versement</th>
                  <th scope="col">Montant versé</th>
                  <th scope="col">Allocation de base</th>
                  <th scope="col">Statut</th>
                </tr>
              </thead>
              <tbody>
                {group.payments.map((payment) => (
                  <tr key={`${payment.annee}-${payment.mois}-${payment.paidAt}`}>
                    <th scope="row" className="month">{payment.mois}</th>
                    <td className="date">{formatDate(payment.paidAt)}</td>
                    <td className="amount">{formatMoney(payment.amount, payment.devise)}</td>
                    <td className="base">{formatMoney(payment.baseAmount, payment.devise)}</td>
                    <td>
                      <StatusPill tone={toneOfStatus(payment.status)}>{payment.statut}</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  )
}
