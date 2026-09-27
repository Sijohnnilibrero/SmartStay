import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Card, Button, Badge, Input } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { 
  Headphones, 
  Search, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  AlertCircle, 
  Send, 
  RefreshCw, 
  X, 
  ChevronRight, 
  User, 
  Calendar 
} from 'lucide-react'

const CATEGORY_LABELS = {
  technical_bug: { label: 'Technical Bug', icon: '🐛', color: 'rose' },
  account_access: { label: 'Account & Access', icon: '🔑', color: 'purple' },
  listing_assistance: { label: 'Listing Assistance', icon: '📋', color: 'blue' },
  general_inquiry: { label: 'General Inquiry', icon: '💬', color: 'teal' },
  other: { label: 'Other', icon: '📌', color: 'amber' },
}

const STATUS_BADGES = {
  open: { label: 'Open', color: 'amber' },
  in_progress: { label: 'In Progress', color: 'blue' },
  resolved: { label: 'Resolved', color: 'teal' },
  closed: { label: 'Closed', color: 'stone' },
}

const TICKETS_PER_PAGE = 8

export default function AdminSupport() {
  const { user, fetchSupportTickets, updateSupportTicketStatus } = useAuthStore()
  const { addToast } = useAppStore()

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [responseMsg, setResponseMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState('open')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [actioning, setActioning] = useState(false)

  const loadTickets = useCallback((silent = false) => {
    if (!silent) setLoading(true)
    fetchSupportTickets({ status: statusFilter, category: categoryFilter })
      .then((data) => {
        setTickets(data || [])
        if (selectedTicket) {
          const updated = (data || []).find((t) => t.id === selectedTicket.id)
          if (updated) setSelectedTicket(updated)
        }
      })
      .catch((err) => {
        console.warn('Support tickets load notice:', err)
      })
      .finally(() => {
        if (!silent) setLoading(false)
      })
  }, [fetchSupportTickets, statusFilter, categoryFilter, selectedTicket])

  useEffect(() => {
    loadTickets()
  }, [statusFilter, categoryFilter])

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, categoryFilter, searchQuery])

  // Realtime subscription for incoming support tickets
  useEffect(() => {
    const channel = supabase
      .channel('admin-support-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        () => {
          loadTickets(true)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [loadTickets])

  const handleOpenTicket = (ticket) => {
    setSelectedTicket(ticket)
    setResponseMsg('')
  }

  const handleCloseModal = () => {
    setSelectedTicket(null)
    setResponseMsg('')
  }

  const handleUpdateStatus = async (status) => {
    if (!selectedTicket) return
    setActioning(true)
    try {
      await updateSupportTicketStatus(selectedTicket.id, status, responseMsg.trim() || selectedTicket.admin_response)
      addToast(`Ticket status updated to ${status}`, 'success')
      setResponseMsg('')
      handleCloseModal()
      loadTickets(true)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setActioning(false)
    }
  }

  const handleSendResponse = async () => {
    if (!selectedTicket || !responseMsg.trim()) return
    setActioning(true)
    try {
      await updateSupportTicketStatus(selectedTicket.id, 'in_progress', responseMsg.trim())
      addToast('Response sent to user', 'success')
      setResponseMsg('')
      loadTickets(true)
    } catch (err) {
      addToast(err.message, 'error')
    } finally {
      setActioning(false)
    }
  }

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase()
    const matchSubject = (t.subject || '').toLowerCase().includes(q)
    const matchMsg = (t.message || '').toLowerCase().includes(q)
    const matchUser = (t.user?.full_name || t.user_email || '').toLowerCase().includes(q)
    return matchSubject || matchMsg || matchUser
  })

  const totalPages = Math.ceil(filteredTickets.length / TICKETS_PER_PAGE) || 1
  const paginatedTickets = filteredTickets.slice((currentPage - 1) * TICKETS_PER_PAGE, currentPage * TICKETS_PER_PAGE)

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2.5 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              <Headphones size={22} />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-stone-900 dark:text-stone-100">
              Customer Service & System Support
            </h1>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Resolve platform assistance requests, technical inquiries, and system support tickets.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={() => loadTickets(false)}
          className="flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </Button>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="flex flex-wrap gap-2.5 items-center bg-white dark:bg-stone-900 p-3 rounded-2xl border border-stone-200 dark:border-white/10 shadow-sm">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input
            className="pl-9 h-9 text-xs"
            placeholder="Search by ticket title, message, or user..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 cursor-pointer"
        >
          <option value="all">All Statuses</option>
          <option value="open">🟡 Open</option>
          <option value="in_progress">🔵 In Progress</option>
          <option value="resolved">🟢 Resolved</option>
          <option value="closed">⚪ Closed</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 px-3 text-xs font-semibold rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 cursor-pointer"
        >
          <option value="all">All Categories</option>
          <option value="technical_bug">🐛 Technical Bug</option>
          <option value="account_access">🔑 Account & Access</option>
          <option value="listing_assistance">📋 Listing Assistance</option>
          <option value="general_inquiry">💬 General Inquiry</option>
        </select>
      </div>

      {/* Full-Width Ticket Inbox */}
      <div className="space-y-3">
        {loading && tickets.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/10 p-12 text-center text-stone-400 text-xs">
            <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-teal-600" />
            Loading customer support tickets...
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/10 p-12 text-center space-y-2 shadow-sm">
            <span className="text-4xl block">🎉</span>
            <p className="font-extrabold text-base text-stone-800 dark:text-stone-200">No support tickets found</p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              All customer inquiries are resolved or no tickets match your current search/filter.
            </p>
          </div>
        ) : (
          paginatedTickets.map((t) => {
            const cat = CATEGORY_LABELS[t.category] || CATEGORY_LABELS.other
            const stat = STATUS_BADGES[t.status] || STATUS_BADGES.open

            return (
              <div
                key={t.id}
                onClick={() => handleOpenTicket(t)}
                className="p-4 sm:p-5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 hover:border-teal-500 dark:hover:border-teal-500/60 hover:shadow-md transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                {/* Left Info */}
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm">{cat.icon}</span>
                    <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                      {cat.label}
                    </span>
                    {t.category === 'account_access' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 uppercase tracking-wide">
                        Appeal
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white truncate group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                    {t.subject}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-1">
                    {t.message}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-stone-400 dark:text-stone-500">
                    <span className="flex items-center gap-1">
                      <User size={12} />
                      <strong className="text-stone-700 dark:text-stone-300">
                        {t.user?.full_name || t.user_email || 'User'}
                      </strong>
                      <span>({t.user?.role || 'user'})</span>
                    </span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Calendar size={12} />
                      {new Date(t.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Right Action & Status Badge */}
                <div className="flex items-center gap-3 self-end sm:self-center flex-shrink-0">
                  <Badge variant={stat.color}>{stat.label}</Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-xs font-semibold group-hover:bg-teal-50 dark:group-hover:bg-teal-950/40 group-hover:border-teal-500 group-hover:text-teal-700 dark:group-hover:text-teal-300 flex items-center gap-1 transition-all"
                  >
                    <span>Review</span>
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </Button>
                </div>
              </div>
            )
          })
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-stone-200 dark:border-white/10 text-xs text-stone-500">
            <span>
              Showing {(currentPage - 1) * TICKETS_PER_PAGE + 1}–{Math.min(currentPage * TICKETS_PER_PAGE, filteredTickets.length)} of {filteredTickets.length} tickets
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="text-xs"
              >
                ← Previous
              </Button>
              <span className="px-2.5 font-bold text-stone-700 dark:text-stone-300">
                {currentPage} / {totalPages}
              </span>
              <Button
                size="sm"
                variant="outline"
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="text-xs"
              >
                Next →
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Pop-Up Modal: Ticket Details & Response */}
      {selectedTicket && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
            onClick={handleCloseModal}
          />

          {/* Modal Card */}
          <div className="relative w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-white/10 rounded-3xl shadow-2xl p-5 sm:p-7 space-y-5 max-h-[90vh] overflow-y-auto z-10 animate-scaleUp">
            
            {/* Top Modal Bar */}
            <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{CATEGORY_LABELS[selectedTicket.category]?.icon || '📌'}</span>
                  <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                    {CATEGORY_LABELS[selectedTicket.category]?.label || 'General'}
                  </span>
                  <Badge variant={STATUS_BADGES[selectedTicket.status]?.color || 'amber'}>
                    {STATUS_BADGES[selectedTicket.status]?.label || selectedTicket.status}
                  </Badge>
                </div>
                <h2 className="text-lg sm:text-xl font-extrabold text-stone-900 dark:text-white">
                  {selectedTicket.subject}
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Submitted by <strong className="text-stone-700 dark:text-stone-300">{selectedTicket.user?.full_name || selectedTicket.user_email || 'User'}</strong> ({selectedTicket.user?.email || selectedTicket.user_email || 'No email'}) on {new Date(selectedTicket.created_at).toLocaleString()}
                </p>
              </div>

              <button
                onClick={handleCloseModal}
                className="p-2 rounded-xl text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-white/5 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* User Inquiry Message */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400 dark:text-stone-500">
                User Inquiry / Issue Description
              </label>
              <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-white/5 text-xs sm:text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                {selectedTicket.message}
              </div>
            </div>

            {/* Existing Support Team Response (if already replied) */}
            {selectedTicket.admin_response && (
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Support Team Response
                </label>
                <div className="p-4 rounded-2xl bg-teal-50/70 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-xs sm:text-sm text-teal-950 dark:text-teal-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.admin_response}
                </div>
              </div>
            )}

            {/* Response & Resolution Form */}
            <div className="space-y-3 pt-3 border-t border-stone-100 dark:border-white/10">
              <label className="text-xs font-bold text-stone-800 dark:text-stone-200">
                Write Reply / Resolution Instructions
              </label>
              <textarea
                rows={4}
                value={responseMsg}
                onChange={(e) => setResponseMsg(e.target.value)}
                placeholder="Write a helpful response or instructions for the user..."
                className="w-full p-3.5 rounded-2xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-800 text-xs sm:text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
              />

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={actioning || !responseMsg.trim()}
                    onClick={handleSendResponse}
                    className="flex items-center gap-1.5 text-xs cursor-pointer"
                  >
                    <Send size={13} />
                    <span>Send Response</span>
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTicket.status !== 'resolved' && (
                    <Button
                      size="sm"
                      disabled={actioning}
                      onClick={() => handleUpdateStatus('resolved')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 size={13} />
                      <span>Mark as Resolved</span>
                    </Button>
                  )}

                  {selectedTicket.status === 'resolved' && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actioning}
                      onClick={() => handleUpdateStatus('open')}
                      className="text-xs cursor-pointer"
                    >
                      Re-open Ticket
                    </Button>
                  )}

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleCloseModal}
                    className="text-xs cursor-pointer text-stone-500"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}
