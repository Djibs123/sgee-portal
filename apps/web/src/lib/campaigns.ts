import type { CampaignView } from './api'
import { formatLongDate } from './format'

/** `closesAt` est exclusif : le dernier jour ouvert est la veille (23:59:59,999). */
export const lastDayOf = (campaign: Pick<CampaignView, 'closesAt'>) =>
  new Date(new Date(campaign.closesAt).getTime() - 1)

export const campaignPeriod = (campaign: Pick<CampaignView, 'opensAt' | 'closesAt'>) =>
  `du ${formatLongDate(campaign.opensAt)} au ${formatLongDate(lastDayOf(campaign))} inclus`
