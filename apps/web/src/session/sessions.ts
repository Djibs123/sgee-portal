import {
  adminLogout,
  applicantLogout,
  getAdminMe,
  getApplicantMe,
  getMe,
  logout,
  type AdminProfile,
  type ApplicantProfile,
  type StudentProfile,
} from '../lib/api'
import { createSession } from './createSession'

export const {
  SessionProvider: StudentSessionProvider,
  useSession: useStudentSession,
} = createSession<StudentProfile>('student', getMe, logout)

export const {
  SessionProvider: AdminSessionProvider,
  useSession: useAdminSession,
} = createSession<AdminProfile>('admin', getAdminMe, adminLogout)

export const {
  SessionProvider: ApplicantSessionProvider,
  useSession: useApplicantSession,
} = createSession<ApplicantProfile>('applicant', getApplicantMe, applicantLogout)
