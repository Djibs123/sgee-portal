import { requestJson, sendJson } from './client'

export type NotificationSpace = 'student' | 'applicant'

export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string
  /** Chemin interne du portail vers l'objet concerné. */
  link: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationsPage = {
  items: NotificationItem[]
  unreadCount: number
  page: number
  pageSize: number
  total: number
}

export const listNotifications = (
  space: NotificationSpace,
  { page = 1, pageSize = 10, unreadOnly = false } = {},
) =>
  requestJson<NotificationsPage>(
    `/${space}/notifications?page=${page}&pageSize=${pageSize}${unreadOnly ? '&unreadOnly=true' : ''}`,
  )

export const markNotificationRead = (space: NotificationSpace, notificationId: string) =>
  sendJson<{ success: boolean }>(`/${space}/notifications/${notificationId}/read`, 'PATCH')

export const markAllNotificationsRead = (space: NotificationSpace) =>
  sendJson<{ updated: number }>(`/${space}/notifications/read-all`, 'POST')
