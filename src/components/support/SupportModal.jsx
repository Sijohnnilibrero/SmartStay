import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { Button, Input, Badge } from '@/components/ui'
import { 
  Headphones, 
  X, 
  Send, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  RefreshCw,
  PlusCircle,
  ListFilter
} from 'lucide-react'

const CATEGORIES = [
  { value: 'technical_bug', label: '🐛 Technical Bug / App Glitch' },
  { value: 'account_access', label: '🔑 Account & Login Assistance' },
  { value: 'listing_assistance', label: '📋 Listing & Verification Help' },
  { value: 'general_inquiry', label: '💬 General Inquiry / Feedback' },
]

const STATUS_BADGES = {
  open: { label: 'Open', color: 'amber' },
  in_progress: { label: 'In Progress', color: 'blue' },
  resolved: { label: 'Resolved', color: 'teal' },
  closed: { label: 'Closed', color: 'stone' },
}

export default function SupportModal({ isOpen, onClose }) {
  const { user, submitSupportTicket, fetchUserSupportTickets } = useAuthStore()
  const { addToast } = useAppStore()

  const [activeTab, setActiveTab] = useState('submit') // 'submit' | 'my_tickets'
  const [category, setCategory] = useState('technical_bug')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)
  const [myTickets, setMyTickets] = useState([])
  const [loadingTickets, setLoadingTickets] = useState(false)

  const loadMyTickets = useCallback(async () => {
    if (!user?.id) return
    setLoadingTickets(true)
    try {
      const tickets = await fetchUserSupportTickets()
      setMyTickets(tickets || [])
    } catch (err) {
      console.warn('Could not load user tickets:', err)
    } finally {
      setLoadingTickets(false)
    }
  }, [user?.id, fetchUserSupportTickets])

  useEffect(() => {
    if (isOpen && user?.id) {
      loadMyTickets()
    }
  }, [isOpen, user?.id, loadMyTickets])

  // Realtime subscription for updates to user's tickets
  useEffect(() => {
    if (!isOpen || !user?.id) return

    const channel = supabase
      .channel(`user-tickets-${user.id}`)
      .on(
        'postgres_changes',
        { 
          event: '*', 
          schema: 'public', 
          table: 'support_tickets',
          filter: `user_id=eq.${user.id}`
        },
        () => {
          loadMyTickets()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [isOpen, user?.id, loadMyTickets])

  if (!isOpen || typeof document === 'undefined') return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) {
      addToast('Please enter both a subject and details', 'error')
      return
    }

    setSubmitting(true)
    try {
      await submitSupportTicket({
        category,
        subject: subject.trim(),
        message: message.trim(),
        priority,
      })
      addToast('Support ticket sent! Our admin team will respond shortly.', 'success')
      setSubject('')
      setMessage('')
      await loadMyTickets()
      setActiveTab('my_tickets')
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-xl bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/15 shadow-2xl flex flex-col z-10 overflow-hidden animate-scaleUp max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between bg-stone-50/80 dark:bg-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              <Headphones size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                Customer Service & Support
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Get assistance directly from SmartStay administrators
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-stone-200 dark:border-white/10 bg-stone-100/50 dark:bg-stone-950/40 p-1.5 gap-1.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => setActiveTab('submit')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'submit'
                ? 'bg-white dark:bg-stone-800 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <PlusCircle size={14} />
            <span>Submit New Ticket</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('my_tickets')}
            className={`flex-1 py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              activeTab === 'my_tickets'
                ? 'bg-white dark:bg-stone-800 text-teal-700 dark:text-teal-300 shadow-sm'
                : 'text-stone-500 hover:text-stone-800 dark:hover:text-stone-200'
            }`}
          >
            <ListFilter size={14} />
            <span>My Tickets</span>
            {myTickets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-teal-600 text-white text-[10px] font-bold">
                {myTickets.length}
              </span>
            )}
          </button>
        </div>

        {/* Tab 1: Submit Form */}
        {activeTab === 'submit' && (
          <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
            {/* Category */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                What do you need help with?
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Subject
              </label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Cannot update property / App error"
                className="h-10 text-xs"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Details & Description
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please explain the issue or question so our team can assist you quickly..."
                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                required
              />
            </div>

            {/* Footer note */}
            <div className="p-3 rounded-xl bg-teal-50/60 dark:bg-teal-950/40 border border-teal-200/60 dark:border-teal-900/40 text-[11px] text-teal-800 dark:text-teal-300 flex items-start gap-2">
              <Sparkles size={14} className="flex-shrink-0 mt-0.5" />
              <span>
                <strong>Note:</strong> For room/stay issues (e.g. key exchange, house rules), please chat directly with your homeowner under <strong>Messages</strong>.
              </span>
            </div>

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 text-xs cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={submitting}
                className="flex-[2] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Send size={13} />
                <span>{submitting ? 'Submitting...' : 'Send to Customer Service'}</span>
              </Button>
            </div>
          </form>
        )}

        {/* Tab 2: My Tickets Feed */}
        {activeTab === 'my_tickets' && (
          <div className="p-5 space-y-4 overflow-y-auto flex-1 max-h-[60vh]">
            <div className="flex items-center justify-between">
              <p className="text-xs text-stone-500 dark:text-stone-400 font-medium">
                Track status and view answers from SmartStay administrators.
              </p>
              <button
                onClick={loadMyTickets}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw size={12} className={loadingTickets ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>

            {loadingTickets && myTickets.length === 0 ? (
              <div className="py-12 text-center text-xs text-stone-400">
                Loading your support tickets...
              </div>
            ) : myTickets.length === 0 ? (
              <div className="py-12 text-center space-y-2 border border-dashed border-stone-200 dark:border-white/10 rounded-2xl p-6">
                <Headphones size={28} className="mx-auto text-stone-300 dark:text-stone-600" />
                <p className="text-xs font-bold text-stone-700 dark:text-stone-300">No support tickets submitted</p>
                <p className="text-[11px] text-stone-400">
                  When you send an inquiry, you can track its response here.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab('submit')}
                  className="text-xs mt-2"
                >
                  Submit an Inquiry
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {myTickets.map((t) => {
                  const stat = STATUS_BADGES[t.status] || STATUS_BADGES.open

                  return (
                    <div
                      key={t.id}
                      className="p-4 rounded-2xl border border-stone-200 dark:border-white/10 bg-stone-50/60 dark:bg-stone-800/40 space-y-3"
                    >
                      {/* Top status & date */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <Badge variant={stat.color}>{stat.label}</Badge>
                          <h4 className="font-extrabold text-sm text-stone-900 dark:text-white mt-1">
                            {t.subject}
                          </h4>
                          <span className="text-[10px] text-stone-400 block mt-0.5">
                            Sent on {new Date(t.created_at).toLocaleDateString()} at {new Date(t.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>

                      {/* User's inquiry */}
                      <div className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200/60 dark:border-white/5 text-xs text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
                        {t.message}
                      </div>

                      {/* Admin Response Box */}
                      {t.admin_response ? (
                        <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/60 space-y-1.5 animate-fadeIn">
                          <div className="flex items-center justify-between text-[11px] font-bold text-teal-800 dark:text-teal-300">
                            <span className="flex items-center gap-1.5">
                              <MessageSquare size={13} />
                              Support Team Response:
                            </span>
                            {t.resolved_at && (
                              <span className="text-[10px] text-teal-600 dark:text-teal-400 font-semibold flex items-center gap-1">
                                <CheckCircle2 size={11} /> Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-teal-950 dark:text-teal-100 whitespace-pre-wrap leading-relaxed font-medium">
                            {t.admin_response}
                          </p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500 font-medium pt-1">
                          <Clock size={12} className="animate-spin text-amber-500" style={{ animationDuration: '4s' }} />
                          <span>Awaiting response from system administration...</span>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

      </div>
    </div>,
    document.body
  )
}
