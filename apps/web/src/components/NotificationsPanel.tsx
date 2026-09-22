import { useCallback, useState } from 'react'
import { Link } from 'react-router'
import {
  getApiErrorMessage,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationSpace,
  type NotificationsPage,
} from '../lib/api'
import { formatDateTime } from '../lib/format'
import { useApiResource } from '../lib/useApiResource'
import { InlineState } from './InlineState'
import { EmptyState } from './ui/EmptyState'
import { Pagination } from './ui/Pagination'
import { StatusMessage } from './ui/StatusMessage'

const PAGE_SIZE = 10

type NotificationsPanelProps = {
  space: NotificationSpace
  onUnreadCountChange?: (count: number) => void
}

/** Liste paginée des notifications (boursier ou candidat). */
export function NotificationsPanel({ space, onUnreadCountChange }: NotificationsPanelProps) {
  const [page, setPage] = useState(1)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const load = useCallback(
    () => listNotifications(space, { page, pageSize: PAGE_SIZE, unreadOnly }),
    [space, page, unreadOnly],
  )
  const { data, loading, error: loadError, reload } = useApiResource<NotificationsPage>(load)

  const refresh = async (action: () => Promise<unknown>) => {
    setError(null)

    try {
      await action()
      const next = await listNotifications(space, { page, pageSize: PAGE_SIZE, unreadOnly })

      onUnreadCountChange?.(next.unreadCount)
      reload()
    } catch (reason) {
      setError(getApiErrorMessage(reason, 'Action impossible pour le moment.'))
    }
  }

  return (
    <section aria-labelledby="notifications-title">
      <div className="toolbar">
        <h2 id="notifications-title" className="info-section-title">
          {data ? `${data.total} notification(s), dont ${data.unreadCount} non lue(s)` : 'Notifications'}
        </h2>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(event) => {
              setUnreadOnly(event.target.checked)
              setPage(1)
            }}
          />
          Non lues uniquement
        </label>
        <button
          type="button"
          className="btn btn-secondary"
          disabled={!data || data.unreadCount === 0}
          onClick={() => void refresh(() => markAllNotificationsRead(space))}
        >
          Tout marquer comme lu
        </button>
      </div>

      <StatusMessage tone="error" message={error} />
      <InlineState loading={loading} error={loadError} />

      {data && data.items.length === 0 && (
        <EmptyState title={unreadOnly ? 'Aucune notification non lue' : 'Aucune notification'} />
      )}

      <ul className="notification-list">
        {data?.items.map((notification) => (
          <li key={notification.id} className={`card${notification.readAt ? '' : ' unread'}`}>
            <p className="notification-title">
              {!notification.readAt && <span className="sr-only">Non lue : </span>}
              {notification.title}
            </p>
            <p>{notification.body}</p>
            <p className="notification-meta">
              <time dateTime={notification.createdAt}>{formatDateTime(notification.createdAt)}</time>
            </p>
            <div className="notification-actions">
              {notification.link && (
                <Link
                  to={notification.link}
                  onClick={() => {
                    if (!notification.readAt) {
                      void markNotificationRead(space, notification.id)
                    }
                  }}
                >
                  Voir le détail
                </Link>
              )}
              {!notification.readAt && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => void refresh(() => markNotificationRead(space, notification.id))}
                  aria-label={`Marquer comme lue : ${notification.title}`}
                >
                  Marquer comme lue
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {data && (
        <Pagination page={page} pageSize={PAGE_SIZE} total={data.total} onChange={setPage} label="Pages de notifications" />
      )}
    </section>
  )
}
