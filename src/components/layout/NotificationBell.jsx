import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, X } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'
import { useNotificationStore } from '@/store/useNotificationStore'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationBell() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead } = useNotificationStore()

  const [open, setOpen] = useState(false)
  const panelRef = useRef(null)
  const btnRef = useRef(null)

  // fetchNotifications is now called globally by useGlobalRealtime, so we don't need polling here anymore.

  // Close on outside click
  useEffect(() => {
    function handleClick(e) {
      if (
        panelRef.current && !panelRef.current.contains(e.target) &&
        btnRef.current && !btnRef.current.contains(e.target)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const handleOpen = () => {
    setOpen((v) => !v)
  }

  const handleClickNotification = async (n) => {
    if (!n.is_read) {
      await markAsRead(n.id)
    }
    setOpen(false)
    if (n.link) navigate(n.link)
  }

  const handleMarkAll = async () => {
    await markAllAsRead()
  }

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        onClick={handleOpen}
        id="notification-bell-btn"
        className="relative p-2 rounded-lg hover:bg-stone-50 text-stone-400 hover:text-stone-700 transition-colors"
        aria-label="Notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-[--coral] text-white text-[9px] font-bold rounded-full flex items-center justify-center leading-none"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-full mt-2 w-80 bg-white rounded-2xl shadow-xl border border-stone-100 z-50 overflow-hidden animate-in"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.12)' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100">
            <div className="flex items-center gap-2">
              <Bell size={14} className="text-stone-500" />
              <p className="text-[13px] font-semibold text-stone-800">Notifications</p>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-[--coral-light] text-[--coral] text-[10px] font-bold rounded-full">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAll}
                  className="flex items-center gap-1 text-[10px] text-stone-400 hover:text-teal-600 transition-colors px-1.5 py-1 rounded-lg hover:bg-teal-50"
                  title="Mark all as read"
                >
                  <CheckCheck size={12} /> All read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:bg-stone-50 transition-colors"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* Notification List */}
          <div className="max-h-72 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-stone-400">
                <Bell size={28} className="mb-2 opacity-30" />
                <p className="text-[12px]">No notifications yet</p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleClickNotification(n)}
                  className={`w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-stone-50 transition-colors border-b border-stone-50 ${
                    !n.is_read ? 'bg-teal-50/40' : ''
                  }`}
                >
                  {/* Icon */}
                  <div
                    className={`w-8 h-8 rounded-xl flex-shrink-0 flex items-center justify-center mt-0.5 ${
                      !n.is_read ? 'bg-teal-100 text-teal-600' : 'bg-stone-100 text-stone-400'
                    }`}
                  >
                    <MessageSquare size={14} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${n.is_read ? 'text-stone-600' : 'text-stone-900 font-semibold'}`}>
                      {n.title}
                    </p>
                    <p className={`text-xs mt-0.5 line-clamp-2 ${n.is_read ? 'text-stone-400' : 'text-stone-500'}`}>
                      {n.body}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-1 uppercase tracking-wider font-semibold">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.is_read && (
                    <div className="w-2 h-2 rounded-full bg-[--teal] flex-shrink-0 mt-1.5" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 border-t border-stone-100 bg-stone-50/50">
              <button
                onClick={() => {
                  setOpen(false)
                  navigate(user?.role === 'owner' ? '/owner/messages' : '/tenant/landlord')
                }}
                className="text-[11px] text-[--teal] font-semibold hover:underline"
              >
                View all messages →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
