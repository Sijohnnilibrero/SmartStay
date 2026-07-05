import { useState, useEffect, useCallback } from 'react'
import { Card, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { AlertTriangle, ChevronDown, ChevronUp, ArrowUpCircle, CheckCircle2, Search, RefreshCw } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'

const STATUS_CONFIG = {
  open:          { label: 'Open',          variant: 'rose',   cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  investigating: { label: 'Investigating', variant: 'amber',  cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  resolved:      { label: 'Resolved',      variant: 'teal',   cls: 'bg-teal-100 text-teal-700 border-teal-200' },
  escalated:     { label: 'Escalated',     variant: 'purple', cls: 'bg-purple-100 text-purple-700 border-purple-200' },
}

const TYPE_LABELS = {
  tenant_vs_homeowner: 'Tenant → Homeowner',
  homeowner_vs_tenant: 'Homeowner → Tenant',
  system: 'System / General',
}

function ComplaintRow({ complaint, isSuperAdmin, onStatusChange, loading }) {
  const [expanded, setExpanded] = useState(false)
  const [notes, setNotes] = useState(complaint.admin_notes || '')
  const [saving, setSaving] = useState(false)
  const addToast = useAppStore(s => s.addToast)
  const status = STATUS_CONFIG[complaint.status] || STATUS_CONFIG.open

  const handleAction = async (newStatus) => {
    setSaving(true)
    try {
      await onStatusChange(complaint.id, newStatus, notes || null)
      addToast(`Complaint marked as "${newStatus}".`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to update complaint.', 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-stone-300 shadow-md' : 'border-stone-200'}`}>
      {/* Row Header */}
      <button
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-stone-50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-0.5 ${complaint.status === 'open' ? 'bg-rose-500' : complaint.status === 'investigating' ? 'bg-amber-500' : complaint.status === 'escalated' ? 'bg-purple-500' : 'bg-teal-500'}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-stone-800 truncate">{complaint.subject}</p>
            <span className={`text-[9px] font-medium px-2 py-0.5 rounded-full border ${status.cls}`}>{status.label}</span>
          </div>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {TYPE_LABELS[complaint.type]} · {complaint.island || 'System'} · {new Date(complaint.created_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex-shrink-0 text-stone-400">
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="border-t border-stone-100 p-4 bg-stone-50/50 space-y-4">
          {/* Counter-complaint warning */}
          {complaint._hasCounterComplaint && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
              <AlertTriangle size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-700 font-medium">
                ⚠️ Counter-complaint detected — the other party has also filed a complaint about this same reservation.
              </p>
            </div>
          )}

          {/* Parties */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-white border border-stone-200 rounded-xl p-3">
              <p className="text-[9px] uppercase tracking-wider text-stone-400 mb-1">Reporter</p>
              <p className="text-[13px] font-semibold text-stone-800">{complaint.reporter?.full_name || '—'}</p>
              <p className="text-[11px] text-stone-500">{complaint.reporter?.email}</p>
              <p className="text-[11px] text-stone-400">{complaint.reporter?.role} · {complaint.reporter?.municipality}</p>
            </div>
            {complaint.accused && (
              <div className="bg-white border border-rose-100 rounded-xl p-3">
                <p className="text-[9px] uppercase tracking-wider text-rose-400 mb-1">Accused</p>
                <p className="text-[13px] font-semibold text-stone-800">{complaint.accused?.full_name || '—'}</p>
                <p className="text-[11px] text-stone-500">{complaint.accused?.email}</p>
                <p className="text-[11px] text-stone-400">{complaint.accused?.role} · {complaint.accused?.municipality}</p>
              </div>
            )}
          </div>

          {/* Description */}
          <div className="bg-white border border-stone-200 rounded-xl p-3">
            <p className="text-[9px] uppercase tracking-wider text-stone-400 mb-1.5">Description</p>
            <p className="text-[12px] text-stone-700 leading-relaxed whitespace-pre-line">{complaint.description}</p>
          </div>

          {/* Admin Notes */}
          <div>
            <p className="text-[9px] uppercase tracking-wider text-stone-400 mb-1.5">Admin Notes (Optional)</p>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Add internal notes about your investigation..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {complaint.status !== 'investigating' && complaint.status !== 'resolved' && (
              <button
                onClick={() => handleAction('investigating')}
                disabled={saving || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors disabled:opacity-50"
              >
                <Search size={12} /> Mark Investigating
              </button>
            )}
            {complaint.status !== 'resolved' && (
              <button
                onClick={() => handleAction('resolved')}
                disabled={saving || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-teal-600 text-white text-xs font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 size={12} /> Mark Resolved
              </button>
            )}
            {!isSuperAdmin && complaint.status !== 'escalated' && complaint.status !== 'resolved' && (
              <button
                onClick={() => handleAction('escalated')}
                disabled={saving || loading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-600 text-white text-xs font-medium hover:bg-purple-700 transition-colors disabled:opacity-50"
              >
                <ArrowUpCircle size={12} /> Escalate to Super Admin
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default function AdminComplaints() {
  const user = useAuthStore(s => s.user)
  const fetchComplaints = useAuthStore(s => s.fetchComplaints)
  const updateComplaintStatus = useAuthStore(s => s.updateComplaintStatus)
  const isSuperAdmin = user?.role === 'super_admin'

  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('all')

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true)
    try {
      const data = await fetchComplaints()
      // Detect counter-complaints: mark rows where the same reservation_id appears with both complaint types
      const resMap = {}
      data.forEach(c => {
        if (c.reservation_id) {
          if (!resMap[c.reservation_id]) resMap[c.reservation_id] = []
          resMap[c.reservation_id].push(c.type)
        }
      })
      const enriched = data.map(c => ({
        ...c,
        _hasCounterComplaint: c.reservation_id
          ? (resMap[c.reservation_id] || []).length > 1
          : false
      }))
      setComplaints(enriched)
    } catch (err) {
      console.error('Failed to load complaints:', err)
    } finally {
      if (!silent) setLoading(false)
    }
  }, [fetchComplaints])

  useEffect(() => { load() }, [load])

  const handleStatusChange = async (id, status, notes) => {
    await updateComplaintStatus(id, status, notes)
    await load(true)
  }

  const filtered = statusFilter === 'all'
    ? complaints
    : complaints.filter(c => c.status === statusFilter)

  const openCount = complaints.filter(c => c.status === 'open').length
  const investigatingCount = complaints.filter(c => c.status === 'investigating').length

  return (
    <div className="page-enter">
      {/* Topbar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-stone-100 bg-white sticky top-0 z-10">
        <div>
          <h1 className="font-bold text-stone-900 text-[15px]">Complaints</h1>
          <p className="text-[11px] text-stone-400 mt-0.5">
            {isSuperAdmin ? 'All islands · System-wide' : `${user?.admin_region || 'Regional'} only`}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => load(true)} className="p-2 rounded-lg hover:bg-stone-100 text-stone-500 transition-colors">
            <RefreshCw size={15} />
          </button>
          <NotificationBell />
        </div>
      </div>

      <div className="p-4 sm:p-6 space-y-5">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Total', value: complaints.length, color: 'text-stone-800' },
            { label: 'Open', value: openCount, color: 'text-rose-600' },
            { label: 'Investigating', value: investigatingCount, color: 'text-amber-600' },
            { label: 'Resolved', value: complaints.filter(c => c.status === 'resolved').length, color: 'text-teal-600' },
          ].map(stat => (
            <Card key={stat.label} className="p-4 text-center">
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-[11px] text-stone-400 mt-0.5">{stat.label}</p>
            </Card>
          ))}
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 flex-wrap">
          {['all', 'open', 'investigating', 'escalated', 'resolved'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all capitalize ${statusFilter === s ? 'bg-stone-800 text-white border-stone-800' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-400'}`}
            >
              {s === 'all' ? 'All' : STATUS_CONFIG[s]?.label || s}
            </button>
          ))}
        </div>

        {/* Complaints List */}
        {loading ? (
          <div className="flex justify-center py-16 text-stone-400">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--teal] mx-auto mb-4" />
              <p className="text-sm">Loading complaints...</p>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <AlertTriangle size={36} className="mx-auto mb-3 text-stone-300" />
            <p className="font-medium text-stone-500">
              {statusFilter === 'all' ? 'No complaints yet' : `No ${statusFilter} complaints`}
            </p>
            <p className="text-sm mt-1">
              {statusFilter === 'all'
                ? 'When users file reports, they will appear here.'
                : 'Try a different filter.'}
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(c => (
              <ComplaintRow
                key={c.id}
                complaint={c}
                isSuperAdmin={isSuperAdmin}
                onStatusChange={handleStatusChange}
                loading={loading}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
