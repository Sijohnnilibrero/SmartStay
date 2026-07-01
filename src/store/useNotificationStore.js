import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'

export const useNotificationStore = create((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    set({ isLoading: true })
    const { data, error } = await supabase
      .from('app_notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      const unreadCount = data.filter((n) => !n.is_read).length
      set({ notifications: data, unreadCount, isLoading: false })
    } else {
      set({ isLoading: false })
    }
  },

  markAsRead: async (id) => {
    const { notifications } = get()
    const target = notifications.find((n) => n.id === id)
    if (!target || target.is_read) return

    // Optimistic update
    const updated = notifications.map((n) =>
      n.id === id ? { ...n, is_read: true } : n
    )
    const unreadCount = updated.filter((n) => !n.is_read).length
    set({ notifications: updated, unreadCount })

    await supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('id', id)
  },

  markAllAsRead: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { notifications } = get()
    const updated = notifications.map((n) => ({ ...n, is_read: true }))
    set({ notifications: updated, unreadCount: 0 })

    await supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
  },

  markMessageNotificationsAsRead: async () => {
    const user = useAuthStore.getState().user
    if (!user) return

    const { notifications } = get()
    // Optimistic update - assume any notification with "message" in title is a message
    const updated = notifications.map((n) => 
      (n.title && n.title.toLowerCase().includes('message')) ? { ...n, is_read: true } : n
    )
    const unreadCount = updated.filter((n) => !n.is_read).length
    set({ notifications: updated, unreadCount })

    await supabase
      .from('app_notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
      .ilike('title', '%message%')
  },

  addNotification: (notification) => {
    const { notifications } = get()
    const updated = [notification, ...notifications]
    const unreadCount = updated.filter((n) => !n.is_read).length
    set({ notifications: updated, unreadCount })
  }
}))
