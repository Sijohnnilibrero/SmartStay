import { useState, useEffect, useCallback } from 'react'
import { Card, Button, Badge, Input } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Headphones, Search, CheckCircle2, Clock, MessageSquare, AlertCircle, Sparkles, Filter, Send, RefreshCw } from 'lucide-react'

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

export default function AdminSupport() {
  const { user, fetchSupportTickets, updateSupportTicketStatus } = useAuthStore()
  const { addToast } = useAppStore()

  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedTicket, setSelectedTicket] = useState(null)
  const [responseMsg, setResponseMsg] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
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

  const handleUpdateStatus = async (status) => {
    if (!selectedTicket) return
    setActioning(true)
    try {
      await updateSupportTicketStatus(selectedTicket.id, status, responseMsg.trim() || selectedTicket.admin_response)
      addToast(`Ticket status updated to ${status}`, 'success')
      setResponseMsg('')
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
    const matchUser = (t.user?.full_name || '').toLowerCase().includes(q)
    return matchSubject || matchMsg || matchUser
  })

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto page-enter">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
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

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Ticket List (Left Column) */}
        <div className="lg:col-span-5 space-y-3">
          {loading && tickets.length === 0 ? (
            <div className="text-center py-12 text-stone-400 text-xs">Loading support tickets...</div>
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-white/10 p-8 text-center space-y-2">
              <span className="text-3xl">🎉</span>
              <p className="font-bold text-sm text-stone-800 dark:text-stone-200">No support tickets found</p>
              <p className="text-xs text-stone-500">All customer inquiries are resolved or no tickets match the filter.</p>
            </div>
          ) : (
            filteredTickets.map((t) => {
              const cat = CATEGORY_LABELS[t.category] || CATEGORY_LABELS.other
              const stat = STATUS_BADGES[t.status] || STATUS_BADGES.open
              const isSelected = selectedTicket?.id === t.id

              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTicket(t)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-teal-50/80 dark:bg-teal-950/40 border-teal-500 ring-1 ring-teal-500/30 shadow-md'
                      : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{cat.icon}</span>
                      <span className="text-[11px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        {cat.label}
                      </span>
                    </div>
                    <Badge variant={stat.color}>{stat.label}</Badge>
                  </div>

                  <h3 className="font-bold text-sm text-stone-900 dark:text-white truncate">
                    {t.subject}
                  </h3>

                  <p className="text-xs text-stone-600 dark:text-stone-300 line-clamp-2 mt-1">
                    {t.message}
                  </p>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-stone-100 dark:border-white/5 text-[11px] text-stone-400">
                    <span>From: {t.user?.full_name || 'User'} ({t.user?.role || 'user'})</span>
                    <span>{new Date(t.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Ticket Details & Resolution Panel (Right Column) */}
        <div className="lg:col-span-7">
          {selectedTicket ? (
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/10 p-5 sm:p-6 space-y-6 shadow-md">
              
              {/* Header */}
              <div className="flex items-start justify-between gap-3 border-b border-stone-100 dark:border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{CATEGORY_LABELS[selectedTicket.category]?.icon || '📌'}</span>
                    <span className="text-xs font-bold uppercase tracking-wider text-teal-600 dark:text-teal-400">
                      {CATEGORY_LABELS[selectedTicket.category]?.label || 'General'}
                    </span>
                  </div>
                  <h2 className="text-lg font-bold text-stone-900 dark:text-white">
                    {selectedTicket.subject}
                  </h2>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Submitted by <strong className="text-stone-700 dark:text-stone-300">{selectedTicket.user?.full_name}</strong> ({selectedTicket.user?.email}) on {new Date(selectedTicket.created_at).toLocaleString()}
                  </p>
                </div>

                <Badge variant={STATUS_BADGES[selectedTicket.status]?.color || 'amber'}>
                  {STATUS_BADGES[selectedTicket.status]?.label || selectedTicket.status}
                </Badge>
              </div>

              {/* User Inquiry Message */}
              <div className="space-y-2">
                <label className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                  User Inquiry / Issue Description
                </label>
                <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200/80 dark:border-white/5 text-xs sm:text-sm text-stone-800 dark:text-stone-200 whitespace-pre-wrap leading-relaxed">
                  {selectedTicket.message}
                </div>
              </div>

              {/* Existing Admin Response (if any) */}
              {selectedTicket.admin_response && (
                <div className="space-y-2">
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
                  Respond & Update Ticket
                </label>
                <textarea
                  rows={4}
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  placeholder="Write a helpful response or resolution instructions to the user..."
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
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/10 p-12 text-center text-stone-400 space-y-2">
              <Headphones size={36} className="mx-auto text-stone-300 dark:text-stone-600" />
              <p className="font-bold text-sm text-stone-700 dark:text-stone-300">No ticket selected</p>
              <p className="text-xs">Click on any customer ticket from the list on the left to view details and reply.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
