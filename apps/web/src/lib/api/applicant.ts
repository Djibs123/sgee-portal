import { requestJson, sendJson } from './client'
import type { CampaignView, ListResponse } from './student'

export type ApplicantProfile = {
  id: string
  email: string
  firstName: string
  lastName: string
  /** AAAA-MM-JJ */
  birthDate: string
  phone: string | null
  emailVerified: boolean
  /** Renseigné quand la bourse est attribuée : le compte boursier est actif. */
  studentNumber: string | null
}

export type RegisterApplicantPayload = {
  email: string
  password: string
  firstName: string
  lastName: string
  birthDate: string
  phone?: string
}

/** Réponse neutre (anti-énumération) : identique que l'adresse soit connue ou non. */
export type NeutralMessage = { message: string }

export type ResettableAccount = 'STUDENT' | 'APPLICANT'

export const registerApplicant = (payload: RegisterApplicantPayload) =>
  sendJson<NeutralMessage>('/applicant/auth/register', 'POST', payload)

export const verifyApplicantEmail = (token: string) =>
  sendJson<{ success: boolean }>('/applicant/auth/verify-email', 'POST', { token })

export const resendApplicantVerification = (email: string) =>
  sendJson<NeutralMessage>('/applicant/auth/resend-verification', 'POST', { email })

export const applicantLogin = (email: string, password: string) =>
  sendJson<{ success: boolean; applicant: ApplicantProfile }>('/applicant/auth/login', 'POST', { email, password })

export const applicantLogout = () => sendJson<{ success: boolean }>('/applicant/auth/logout', 'POST')

export const getApplicantMe = () => requestJson<ApplicantProfile>('/applicant/me')

export const requestPasswordReset = (email: string, accountType: ResettableAccount) =>
  sendJson<NeutralMessage>('/auth/password/forgot', 'POST', { email, accountType })

export const resetPassword = (token: string, password: string) =>
  sendJson<{ success: boolean }>('/auth/password/reset', 'POST', { token, password })

/** Campagnes de l'année en cours (page d'accueil, sans authentification). */
export const listPublicCampaigns = () => requestJson<ListResponse<CampaignView>>('/public/campaigns')
