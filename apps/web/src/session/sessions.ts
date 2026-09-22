import {
  adminLogout,
  getAdminMe,
  getMe,
  logout,
  type AdminProfile,
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
