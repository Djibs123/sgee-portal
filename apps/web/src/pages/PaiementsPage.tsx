import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { getStudentPayments, type StudentPayment } from '../lib/api'
import { useApiResource } from '../lib/useApiResource'

function parseAmount(value: string) {
  const normalized = value
    .replace(/[^\d,.-]/g, '')
    .replace(',', '.')

  return Number.parseFloat(normalized) || 0
}

function formatAmount(value: number) {
  return `${value.toFixed(2).replace('.', ',')} EUR`
}

function groupPayments(payments: StudentPayment[]) {
  return payments.reduce<Record<string, StudentPayment[]>>((groups, payment) => {
    groups[payment.annee] ??= []
    groups[payment.annee].push(payment)
    return groups
  }, {})
}

export function PaiementsPage() {
  const { data, loading, error } = useApiResource(getStudentPayments)
  const paiements = data?.items ?? []
  const grouped = groupPayments(paiements)
  const years = Object.keys(grouped).sort().reverse()

  const yearTotals = years.reduce<Record<string, string>>((totals, year) => {
    const sum = grouped[year].reduce((acc, payment) => acc + parseAmount(payment.montant), 0)
    totals[year] = formatAmount(sum)
    return totals
  }, {})

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Paiements" />
        <h1>Historique des Paiements</h1>
        <p>Ensemble des versements effectues depuis l'attribution de votre bourse</p>
      </div>

      <InlineState loading={loading} error={error} />

      <div className="stat-grid" style={{ marginBottom: '24px' }}>
        {years.slice(0, 3).map((year, index) => (
          <div key={year} className="card stat-card">
            <div className="stat-label">Total {year}</div>
            <div className="stat-value" style={{ color: index === 0 ? 'var(--green)' : undefined, fontSize: '18px' }}>{yearTotals[year]}</div>
            <div className="stat-sub">{grouped[year].length} versements</div>
          </div>
        ))}
      </div>

      {years.map((year) => (
        <div key={year} className="payment-year-group">
          <div className="payment-year-label">
            <span>Annee scolaire {year}</span>
            <span style={{ color: 'var(--green)', fontWeight: 700 }}>{yearTotals[year]}</span>
          </div>
          <div className="card" style={{ padding: '0' }}>
            <table className="payment-table">
              <thead>
                <tr>
                  <th>Mois</th>
                  <th>Date de traitement</th>
                  <th>Montant total</th>
                  <th>Allocation base</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {grouped[year].map((p, i) => (
                  <tr key={`${p.annee}-${p.mois}-${i}`}>
                    <td className="month">{p.mois}</td>
                    <td className="date">{p.date}</td>
                    <td className="amount">{p.montant}</td>
                    <td className="base">{p.base}</td>
                    <td><span className="status-pill actif" style={{ fontSize: '11px' }}>{p.statut}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
