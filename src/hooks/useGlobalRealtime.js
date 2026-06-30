import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { useNotificationStore } from '@/store/useNotificationStore'

export function useGlobalRealtime() {
  const user = useAuthStore((s) => s.user)
  const addToast = useAppStore((s) => s.addToast)
  const { fetchNotifications, addNotification } = useNotificationStore()

  // Initial fetch of notifications
  useEffect(() => {
    if (user) {
      fetchNotifications()
    }
  }, [user, fetchNotifications])

  useEffect(() => {
    if (!user) return

    const channel = supabase.channel('global-db-changes')

    channel
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'app_notifications' },
        (payload) => {
          if (payload.new.user_id === user.id) {
            // Add to store
            addNotification(payload.new)
            // Fire toast
            addToast(`🔔 ${payload.new.title}: ${payload.new.body}`, 'info')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, addToast, addNotification])
}
