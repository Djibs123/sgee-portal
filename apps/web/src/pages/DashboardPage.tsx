import { Link } from 'react-router'
import { Breadcrumb } from '../components/Breadcrumb'
import { InlineState } from '../components/InlineState'
import { CampaignBand } from '../components/CampaignBand'
import { getStudentDashboard, type StudentDashboard } from '../lib/api'
import { formatDate, formatMoney, formatMonthYear } from '../lib/format'
import { useApiResource } from '../lib/useApiResource'
import { useDocumentTitle } from '../lib/useDocumentTitle'

type Alert = {
  key: string
  tone: 'info' | 'warning' | 'success'
  title: string
  text: string
  link?: { to: string; label: string }
}

/** Alertes dérivées des données réelles du dossier. L'échéance de campagne n'y figure pas :
 * elle est portée une seule fois, par la bande de campagne. */
function buildAlerts(data: StudentDashboard): Alert[] {
  const alerts: Alert[] = []

  if (data.documents.toProvide.length > 0) {
    alerts.push({
      key: 'documents',
      tone: 'warning',
      title: `${data.documents.toProvide.length} document(s) à fournir`,
      text: data.documents.toProvide.map((document) => document.name).join(', '),
      link: { to: '/portal/documents', label: 'Déposer mes documents' },
    })
  }

  if (!data.rib.active) {
    alerts.push({
      key: 'rib-missing',
      tone: 'warning',
      title: 'Aucun RIB validé',
      text: 'Les versements ne peuvent pas être effectués sans RIB validé.',
      link: { to: '/portal/rib', label: 'Renseigner mon RIB' },
    })
  } else if (data.rib.hasPendingChange) {
    alerts.push({
      key: 'rib-pending',
      tone: 'info',
      title: 'Changement de RIB en cours de vérification',
      text: 'Les versements continuent sur votre RIB actif en attendant la validation.',
    })
  }

  return alerts
}

/** Ce que le boursier peut faire maintenant sur sa campagne. */
function RenewalAction({ renewal }: { renewal: StudentDashboard['renewal'] }) {
  const { campaign, request, eligibility } = renewal
  const blocker = eligibility && !eligibility.eligible ? eligibility.blockers[0]?.message : null

  if (request && request.status !== 'WITHDRAWN') {
    return (
      <p>
        Demande {request.reference} – {request.statusLabel.toLowerCase()}.{' '}
        <Link to="/portal/renouvellement">Suivre ma demande</Link>
      </p>
    )
  }

  if (campaign?.phase !== 'OPEN') {
    return null
  }

  return blocker ? (
    <p className="campaign-band-note">{blocker}</p>
  ) : (
    <p>
      <Link to="/portal/renouvellement">Commencer ma demande</Link>
    </p>
  )
}

export function DashboardPage() {
  useDocumentTitle('Tableau de bord')

  const { data, loading, error } = useApiResource(getStudentDashboard)
  const alerts = data ? buildAlerts(data) : []

  return (
    <div>
      <div className="page-header">
        <Breadcrumb label="Tableau de bord" />
        <h1>Bonjour{data ? `, ${data.student.firstName}` : ''}</h1>
        <p>
          État de votre dossier de bourse
          {data?.student.academicYear ? ` – année universitaire ${data.student.academicYear}` : ''}
        </p>
      </div>

      <InlineState loading={loading} error={error} />

      {data && (
        <div className="portal-stack">
          {data.renewal.campaign && (
            <CampaignBand campaign={data.renewal.campaign}>
              <RenewalAction renewal={data.renewal} />
            </CampaignBand>
          )}

          <section className="student-card" aria-labelledby="student-card-title">
            <h2 id="student-card-title" className="student-name">
              {data.student.lastName.toUpperCase()} {data.student.firstName}
            </h2>
            <p className="student-meta">
              N° étudiant {data.student.studentNumber}
              {data.student.matricule ? ` – matricule ${data.student.matricule}` : ''}
            </p>
            <p className="student-meta">
              {[data.student.level, data.student.field, data.student.academy, data.student.country]
                .filter(Boolean)
                .join(' – ')}
            </p>
            <ul className="student-chips" aria-label="Caractéristiques de la bourse">
              <li className="chip">Bourse {data.scholarship.statusLabel.toLowerCase()}</li>
              {data.scholarship.type && <li className="chip">{data.scholarship.type}</li>}
              {data.scholarship.paymentMethod && <li className="chip">{data.scholarship.paymentMethod}</li>}
            </ul>
          </section>

          {alerts.length > 0 && (
            <section className="card dashboard-alerts" aria-labelledby="alerts-title">
              <h2 id="alerts-title" className="card-title">À faire et informations</h2>
              <ul>
                {alerts.map((alert) => (
                  <li key={alert.key} className={`alert ${alert.tone}`}>
                    <div>
                      <span className="alert-title">{alert.title}</span>
                      {alert.text}
                      {alert.link && (
                        <>
                          {' '}
                          <Link to={alert.link.to}>{alert.link.label}</Link>
                        </>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="stat-grid" aria-label="Chiffres clés">
            <article className="stat-card">
              <h2 className="stat-label">Allocation mensuelle</h2>
              <p className="stat-value">
                {formatMoney(data.scholarship.monthlyAllocation, data.scholarship.currency)}
              </p>
              {data.scholarship.monthlyAllocationCfa !== null && (
                <p className="stat-sub">{formatMoney(data.scholarship.monthlyAllocationCfa, 'XOF')}</p>
              )}
            </article>
            <article className="stat-card">
              <h2 className="stat-label">Dernier versement</h2>
              <p className="stat-value">
                {data.payments.last ? formatMoney(data.payments.last.amount, data.payments.last.currency) : '—'}
              </p>
              <p className="stat-sub">
                {data.payments.last
                  ? `${data.payments.last.month} – versé le ${formatDate(data.payments.last.paidAt)}`
                  : 'Aucun versement'}
              </p>
            </article>
            <article className="stat-card">
              <h2 className="stat-label">Prochain versement</h2>
              <p className="stat-value">
                {data.payments.nextEstimatedAt ? formatMonthYear(data.payments.nextEstimatedAt) : '—'}
              </p>
              <p className="stat-sub">
                {data.payments.nextEstimatedAt ? 'Estimation selon le rythme mensuel' : 'Aucun versement prévu'}
              </p>
            </article>
            <article className="stat-card">
              <h2 className="stat-label">Total versé {data.student.academicYear ?? ''}</h2>
              <p className="stat-value">{formatMoney(data.payments.currentYearTotal, data.payments.currency)}</p>
              <p className="stat-sub">
                {data.payments.currentYearCount} versement(s) – <Link to="/portal/paiements">voir le détail</Link>
              </p>
            </article>
          </section>

          {data.scholarship.progressPercent !== null && (
            <section className="card" aria-labelledby="progress-title">
              <h2 id="progress-title" className="card-title">Durée de la bourse</h2>
              <div className="progress-labels">
                <span>Début : {formatDate(data.scholarship.startDate)}</span>
                <span>Fin : {formatDate(data.scholarship.endDate)}</span>
              </div>
              <div
                className="progress-bar"
                role="progressbar"
                aria-labelledby="progress-title"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={data.scholarship.progressPercent}
                aria-valuetext={`${data.scholarship.progressPercent} % de la durée écoulée`}
              >
                <div className="progress-fill" style={{ width: `${data.scholarship.progressPercent}%` }} />
              </div>
              <p className="stat-sub">
                {data.scholarship.progressPercent} % de la durée écoulée
                {data.scholarship.attributionNumber ? ` – attribution n° ${data.scholarship.attributionNumber}` : ''}
              </p>
            </section>
          )}

          <section className="card" aria-labelledby="latest-notifications-title">
            <h2 id="latest-notifications-title" className="card-title">
              Dernières notifications
              {data.notifications.unreadCount > 0 && ` (${data.notifications.unreadCount} non lue(s))`}
            </h2>
            {data.notifications.latest.length === 0 ? (
              <p className="stat-sub">Aucune notification pour le moment.</p>
            ) : (
              <ul className="notification-list compact">
                {data.notifications.latest.map((notification) => (
                  <li key={notification.id} className={notification.readAt ? '' : 'unread'}>
                    <strong>{notification.title}</strong>
                    <span>{formatDate(notification.createdAt)}</span>
                  </li>
                ))}
              </ul>
            )}
            <Link to="/portal/notifications">Toutes les notifications</Link>
          </section>
        </div>
      )}
    </div>
  )
}
