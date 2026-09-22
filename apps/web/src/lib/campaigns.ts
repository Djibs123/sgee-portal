import type { CampaignView } from './api'
import { formatLongDate } from './format'

/** `closesAt` est exclusif : le dernier jour ouvert est la veille (23:59:59,999). */
export const lastDayOf = (campaign: Pick<CampaignView, 'closesAt'>) =>
  new Date(new Date(campaign.closesAt).getTime() - 1)

export const campaignPeriod = (campaign: Pick<CampaignView, 'opensAt' | 'closesAt'>) =>
  `du ${formatLongDate(campaign.opensAt)} au ${formatLongDate(lastDayOf(campaign))} inclus`

/*
 * Saisie des campagnes par jour calendaire : bornes à minuit UTC (heure de Dakar, sans heure d'été).
 * Le dernier jour saisi est inclus, donc `closesAt` = lendemain à 00:00 UTC (borne exclusive de l'API).
 */
const DAY_MS = 24 * 60 * 60 * 1000

export const dayOf = (value: string | Date) => new Date(value).toISOString().slice(0, 10)

export const opensAtFromDay = (day: string) => new Date(`${day}T00:00:00.000Z`).toISOString()

export const closesAtFromLastDay = (day: string) => new Date(new Date(`${day}T00:00:00.000Z`).getTime() + DAY_MS).toISOString()
