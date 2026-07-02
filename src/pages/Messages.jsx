import { useState, useEffect, useCallback, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { useNotificationStore } from '@/store/useNotificationStore'
import { Card, Button } from '@/components/ui'
import { MessageSquare, CheckCheck, Send, ArrowLeft } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function toInitials(name = '') {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() || '??'
}

const ROLE_COLORS = {
  owner: { bg: '#E1F5EE', text: '#0F6E56' },
  tenant: { bg: '#FAEEDA', text: '#BA7517' },
  admin: { bg: '#EEEDFE', text: '#534AB7' },
}

export default function Messages() {
  const location = useLocation()
  const user = useAuthStore((s) => s.user)
  const fetchConversations = useAuthStore((s) => s.fetchConversations)
  const fetchMessages = useAuthStore((s) => s.fetchMessages)
  const sendMessage = useAuthStore((s) => s.sendMessage)
  const markAllNotificationsRead = useAuthStore((s) => s.markAllNotificationsRead)
  const markNotificationRead = useAuthStore((s) => s.markNotificationRead)
  const addToast = useAppStore((s) => s.addToast)

  const [conversations, setConversations] = useState([])
  const [selected, setSelected] = useState(null)   // { otherId, otherProfile }
  const [thread, setThread] = useState([])
  const [loading, setLoading] = useState(true)
  const [threadLoading, setThreadLoading] = useState(false)
  const [replyText, setReplyText] = useState('')
  const [replying, setReplying] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)

  const isOwner = user?.role === 'owner'
  const messagesEndRef = useRef(null)

  // Auto-scroll to bottom whenever thread updates
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [thread])

  const loadConversations = useCallback(async () => {
    setLoading(true)
    let data = await fetchConversations()

    // Handle jump-to-chat from another page
    const autoUserId = location.state?.autoSelectUser?.id
    if (autoUserId) {
      const existing = data.find((c) => c.otherId === autoUserId)
      if (existing) {
        handleSelectConversation(existing)
      } else {
        // Create an empty dummy conversation to start chatting
        const autoUserProfile = location.state.autoSelectUser
        const dummyConv = {
          otherId: autoUserId,
          otherProfile: autoUserProfile,
          latestMessage: { created_at: new Date().toISOString(), body: 'New conversation' },
          unreadCount: 0,
        }
        data = [dummyConv, ...data]
        handleSelectConversation(dummyConv)
      }
      // Clear state so it doesn't re-trigger on refresh
      window.history.replaceState({}, document.title)
    }

    setConversations(data)
    setLoading(false)
  }, [fetchConversations, location.state])

  useEffect(() => { loadConversations() }, [loadConversations])

  const loadThread = useCallback(async (otherId) => {
    if (!otherId) return
    setThreadLoading(true)
    const data = await fetchMessages(otherId)
    setThread(data)
    setThreadLoading(false)
  }, [fetchMessages])

  // Silent thread refresh — no spinner, just swaps data in
  const silentRefreshThread = useCallback(async (otherId) => {
    if (!otherId) return
    const data = await fetchMessages(otherId)
    setThread(data)
  }, [fetchMessages])

  // Silent conversations refresh — sidebar updates without flash
  const silentRefreshConversations = useCallback(async () => {
    const data = await fetchConversations()
    setConversations(data)
  }, [fetchConversations])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('messages-page-changes')
    channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
      if (payload.new.sender_id === user.id || payload.new.receiver_id === user.id) {
        // Silently refresh sidebar — no flash
        silentRefreshConversations()
        // Silently append new message to thread — no flash
        if (selected && (payload.new.sender_id === selected.otherId || payload.new.receiver_id === selected.otherId)) {
          silentRefreshThread(selected.otherId)
        }
      }
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, selected, silentRefreshConversations, silentRefreshThread])

  const handleSelectConversation = async (conv) => {
    setSelected(conv)
    setMobilePanelOpen(true)
    setReplyText('')

    // Mark unread messages in this conversation as read
    if (conv.unreadCount > 0) {
      // Mark each unread message (received by current user) as read
      await markAllNotificationsRead()
      // Clear global bell notification
      await useNotificationStore.getState().markMessageNotificationsAsRead()
      setConversations((prev) =>
        prev.map((c) => c.otherId === conv.otherId ? { ...c, unreadCount: 0 } : c)
      )
    }

    await loadThread(conv.otherId)
  }

  const handleSendReply = async (e) => {
    e.preventDefault()
    if (!replyText.trim() || !selected) return

    // Optimistic update — instantly show message in chat
    const optimisticMsg = {
      id: `optimistic-${Date.now()}`,
      sender_id: user.id,
      receiver_id: selected.otherId,
      body: replyText.trim(),
      created_at: new Date().toISOString(),
    }
    setThread((prev) => [...prev, optimisticMsg])
    setReplyText('')

    setReplying(true)
    try {
      await sendMessage({
        owner_id: selected.otherId,
        property_id: null,
        body: optimisticMsg.body,
      })
      // Silently replace optimistic message with real one from server
      silentRefreshThread(selected.otherId)
      silentRefreshConversations()
    } catch (err) {
      // Remove optimistic message on failure
      setThread((prev) => prev.filter((m) => m.id !== optimisticMsg.id))
      setReplyText(optimisticMsg.body)
      addToast(err.message || 'Failed to send.', 'error')
    } finally {
      setReplying(false)
    }
  }

  const totalUnread = conversations.reduce((sum, c) => sum + c.unreadCount, 0)

  return (
    <div className="page-enter flex flex-col h-screen">
      {/* Page Header */}
      <div className="px-6 pt-5 pb-4 bg-white border-b border-stone-100 shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-bold text-lg md:text-xl text-stone-800">Messages</p>
            <p className="text-sm text-stone-400 mt-0.5">
              {totalUnread > 0
                ? `${totalUnread} unread message${totalUnread > 1 ? 's' : ''}`
                : 'All caught up'}
            </p>
          </div>
          <NotificationBell />
          {totalUnread > 0 && (
            <button
              onClick={async () => {
                await markAllNotificationsRead()
                await useNotificationStore.getState().markMessageNotificationsAsRead()
                setConversations((prev) => prev.map((c) => ({ ...c, unreadCount: 0 })))
              }}
              className="flex items-center gap-1.5 text-xs text-stone-500 hover:text-teal-600 transition-colors px-3 py-1.5 rounded-lg border border-stone-200 hover:border-teal-300 hover:bg-teal-50"
            >
              <CheckCheck size={13} /> Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-1 min-h-0">

        {/* ── Left: Conversations list ── */}
        <div className={`w-full md:w-80 flex-shrink-0 border-r border-stone-100 flex flex-col bg-white ${mobilePanelOpen ? 'hidden md:flex' : 'flex'}`}>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-stone-400 text-sm">
              Loading…
            </div>
          ) : conversations.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-stone-400">
              <div className="w-14 h-14 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
                <MessageSquare size={22} className="opacity-40" />
              </div>
              <p className="text-sm font-medium text-stone-600">No messages yet</p>
              <p className="text-xs mt-1 leading-relaxed">
                {isOwner
                  ? 'Tenants can message you from their My Landlord page.'
                  : 'Browse properties to message a host, or go to My Landlord if you have a booking.'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y divide-stone-50">
              {conversations.map((conv) => {
                const isActive = selected?.otherId === conv.otherId
                const colors = ROLE_COLORS[conv.otherProfile?.role] || ROLE_COLORS.tenant
                return (
                  <button
                    key={conv.otherId}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left px-4 py-4 flex items-start gap-3 hover:bg-stone-50 transition-colors ${
                      isActive ? 'bg-teal-50/60 border-r-2 border-r-[--teal]' : ''
                    } ${conv.unreadCount > 0 ? 'bg-amber-50/20' : ''}`}
                  >
                    {/* Avatar */}
                    <div
                      className="w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-[12px] font-bold shadow-sm overflow-hidden"
                      style={{ background: colors.bg, color: colors.text }}
                    >
                      {conv.otherProfile?.avatar_url ? (
                        <img src={conv.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        toInitials(conv.otherProfile?.full_name)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <p className={`text-[13px] truncate ${conv.unreadCount > 0 ? 'font-bold text-stone-900' : 'font-medium text-stone-700'}`}>
                          {conv.otherProfile?.full_name || 'Unknown'}
                        </p>
                        <span className="text-[10px] text-stone-400 flex-shrink-0">
                          {timeAgo(conv.latestMessage.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <p className="text-[11px] text-stone-500 truncate flex-1">
                          {conv.latestMessage.sender_id === user?.id ? 'You: ' : ''}
                          {conv.latestMessage.body}
                        </p>
                        {conv.unreadCount > 0 && (
                          <span className="flex-shrink-0 min-w-[18px] h-[18px] px-1 bg-[--teal] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right: Thread view ── */}
        <div className={`flex-1 flex flex-col min-w-0 min-h-0 bg-stone-50/50 ${mobilePanelOpen ? 'flex' : 'hidden md:flex'}`}>
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-center text-stone-400">
              <div className="w-16 h-16 rounded-2xl bg-stone-100 flex items-center justify-center mb-3">
                <MessageSquare size={26} className="opacity-30" />
              </div>
              <p className="text-sm font-medium text-stone-600">Select a conversation</p>
              <p className="text-xs mt-1">Click a name on the left to open the thread.</p>
            </div>
          ) : (
            <div className="flex flex-col h-full min-h-0">
              {/* Thread header */}
              <div className="px-4 py-3.5 bg-white border-b border-stone-100 flex items-center gap-3 shrink-0">
                {/* Mobile back button */}
                <button
                  onClick={() => setMobilePanelOpen(false)}
                  className="md:hidden p-1 -ml-1 text-stone-400 hover:text-stone-700 rounded-lg"
                >
                  <ArrowLeft size={18} />
                </button>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center text-[11px] font-bold flex-shrink-0 overflow-hidden"
                  style={{
                    background: ROLE_COLORS[selected.otherProfile?.role]?.bg || '#E1F5EE',
                    color: ROLE_COLORS[selected.otherProfile?.role]?.text || '#0F6E56',
                  }}
                >
                  {selected.otherProfile?.avatar_url ? (
                    <img src={selected.otherProfile.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    toInitials(selected.otherProfile?.full_name)
                  )}
                </div>
                <div>
                  <p className="text-[13px] font-semibold text-stone-800">
                    {selected.otherProfile?.full_name || 'Unknown'}
                  </p>
                  <p className="text-[10px] text-stone-400 capitalize">
                    {selected.otherProfile?.role || 'User'}
                  </p>
                </div>
              </div>

              {/* Messages — scrollable area, reply bar stays fixed below */}
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
                {threadLoading ? (
                  <div className="flex items-center justify-center py-10 text-stone-400 text-sm">
                    Loading conversation…
                  </div>
                ) : thread.length === 0 ? (
                  <div className="flex items-center justify-center py-10 text-stone-400 text-sm">
                    No messages in this thread yet.
                  </div>
                ) : thread.map((m) => {
                  const isMine = m.sender_id === user?.id
                  return (
                    <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[72%] px-4 py-2.5 rounded-2xl text-[12px] leading-relaxed shadow-sm ${
                          isMine
                            ? 'bg-[--teal] text-white rounded-br-sm'
                            : 'bg-white text-stone-700 border border-stone-100 rounded-bl-sm'
                        }`}
                      >
                        <p>{m.body}</p>
                        <p className={`text-[9px] mt-1 ${isMine ? 'text-white/60' : 'text-stone-400'}`}>
                          {timeAgo(m.created_at)}
                        </p>
                      </div>
                    </div>
                  )
                })}
                {/* Invisible anchor — always scrolled into view */}
                <div ref={messagesEndRef} />
              </div>

              {/* Reply box */}
              <div className="px-4 py-3 bg-white border-t border-stone-100 shrink-0">
                <form onSubmit={handleSendReply} className="flex gap-2">
                  <input
                    type="text"
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder={`Reply to ${selected.otherProfile?.full_name?.split(' ')[0] || 'them'}…`}
                    className="flex-1 px-3.5 py-2 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    className="px-4 py-2 flex items-center gap-1.5 flex-shrink-0"
                    disabled={replying || !replyText.trim()}
                  >
                    {replying
                      ? <span className="animate-spin w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" />
                      : <Send size={14} />
                    }
                  </Button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
