import { useId, type ReactNode } from 'react'
import type { CampaignView } from '../lib/api'
import { lastDayOf } from '../lib/campaigns'
import { formatLongDate } from '../lib/format'

const DAY_MS = 24 * 60 * 60 * 1000

const plural = (count: number, word: string) => `${count} ${word}${count > 1 ? 's' : ''}`

/** Temps qui reste, dit en clair : c'est la seule information ambre de l'écran. */
function remaining(campaign: CampaignView, now: Date) {
  const opens = new Date(campaign.opensAt).getTime()
  const closes = new Date(campaign.closesAt).getTime()

  if (campaign.phase === 'UPCOMING') {
    return { text: `Ouvre dans ${plural(Math.ceil((opens - now.getTime()) / DAY_MS), 'jour')}`, urgent: false }
  }

  if (campaign.phase === 'CLOSED') {
    return { text: 'Dépôt clos', urgent: false }
  }

  const days = Math.ceil((closes - now.getTime()) / DAY_MS) - 1

  return days <= 0
    ? { text: 'Dernier jour pour déposer', urgent: true }
    : { text: `${plural(days, 'jour')} pour déposer`, urgent: true }
}

type CampaignBandProps = {
  campaign: CampaignView
  /** Précisions sous la période : consignes de la campagne, pièces attendues… */
  children?: ReactNode
  /** Niveau du titre, selon la place de la bande dans la page. */
  headingLevel?: 'h2' | 'h3'
  now?: Date
}

/**
 * L'échéance rendue physique : la campagne occupe une bande, du premier au dernier jour,
 * avec le repère du jour. Le graphique est décoratif (`aria-hidden`) ; tout ce qu'il montre
 * est aussi écrit en texte.
 */
export function CampaignBand({ campaign, children, headingLevel: Heading = 'h2', now = new Date() }: CampaignBandProps) {
  const titleId = useId()
  const opens = new Date(campaign.opensAt).getTime()
  const closes = new Date(campaign.closesAt).getTime()
  const elapsed = Math.min(1, Math.max(0, (now.getTime() - opens) / (closes - opens)))
  const left = remaining(campaign, now)
  const phase = campaign.phase.toLowerCase()

  return (
    <section className={`campaign-band ${phase}`} aria-labelledby={titleId}>
      <div className="campaign-band-head">
        <Heading id={titleId} className="campaign-band-title">
          {campaign.title}
        </Heading>
        <span className="campaign-band-year">Année {campaign.academicYear.label}</span>
        <span className={left.urgent ? 'campaign-band-left' : 'campaign-band-left none'}>{left.text}</span>
      </div>

      <div className="campaign-track" aria-hidden="true">
        <div className="campaign-track-done" style={{ width: `${elapsed * 100}%` }} />
        {campaign.phase === 'OPEN' && <div className="campaign-track-today" style={{ left: `${elapsed * 100}%` }} />}
      </div>
      <div className="campaign-band-scale" aria-hidden="true">
        <span>{formatLongDate(campaign.opensAt)}</span>
        <span>{formatLongDate(lastDayOf(campaign))}</span>
      </div>

      <p className="campaign-band-note">
        Dépôt du {formatLongDate(campaign.opensAt)} au {formatLongDate(lastDayOf(campaign))} inclus.
      </p>
      {children}
    </section>
  )
}
