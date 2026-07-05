import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { X, AlertTriangle, Send } from 'lucide-react'

/**
 * ReportIssueModal
 * Props:
 *   isOpen       - boolean
 *   onClose      - fn
 *   type         - 'tenant_vs_homeowner' | 'homeowner_vs_tenant' | 'system'
 *   accusedId    - UUID of the person being complained about
 *   accusedName  - display name of the accused
 *   reservationId - UUID (optional)
 *   propertyId   - UUID (optional)
 */
export default function ReportIssueModal({ isOpen, onClose, type, accusedId, accusedName, reservationId, propertyId }) {
  const submitComplaint = useAuthStore(s => s.submitComplaint)
  const addToast = useAppStore(s => s.addToast)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!subject.trim() || !description.trim()) return
    setLoading(true)
    try {
      await submitComplaint({
        type,
        accused_id: accusedId || null,
        reservation_id: reservationId || null,
        property_id: propertyId || null,
        subject: subject.trim(),
        description: description.trim(),
      })
      addToast('Complaint submitted. An admin will review it shortly.', 'success')
      setSubject('')
      setDescription('')
      onClose()
    } catch (err) {
      addToast(err.message || 'Failed to submit complaint.', 'error')
    } finally {
      setLoading(false)
    }
  }

  const typeLabels = {
    tenant_vs_homeowner: 'Reporting a Homeowner',
    homeowner_vs_tenant: 'Reporting a Tenant',
    system: 'System / General Issue',
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-rose-100 flex items-center justify-center">
              <AlertTriangle size={16} className="text-rose-600" />
            </div>
            <div>
              <h2 className="text-[14px] font-semibold text-stone-800">Report an Issue</h2>
              <p className="text-[11px] text-stone-400">{typeLabels[type] || 'Submit a Complaint'}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
            <X size={16} className="text-stone-500" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {type === 'tenant_vs_homeowner' && (
            <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 mb-2">
              <p className="text-[12px] text-amber-800">
                <strong>Wait!</strong> If you are reporting a physical issue with the room (like a broken aircon), please try <strong>messaging your landlord directly</strong> first. Only use this form for serious unresolved disputes.
              </p>
            </div>
          )}

          {accusedName && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              <p className="text-[12px] text-rose-700">
                You are filing a complaint against <strong>{accusedName}</strong>. An admin will be notified and will review your report.
              </p>
            </div>
          )}

          <div>
            <label className="text-[11px] uppercase tracking-wider text-stone-400 block mb-1.5">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder="Brief title of your complaint..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400"
              required
              maxLength={120}
            />
          </div>

          <div>
            <label className="text-[11px] uppercase tracking-wider text-stone-400 block mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue in detail. The more context you provide, the faster the admin can act..."
              rows={5}
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-400 resize-none"
              required
              maxLength={1000}
            />
            <p className="text-[10px] text-stone-400 text-right mt-1">{description.length}/1000</p>
          </div>

          <p className="text-[11px] text-stone-400">
            ⚠️ False reports may result in account suspension. Please only report genuine issues.
          </p>

          <div className="flex gap-2.5 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-stone-200 text-sm font-medium text-stone-600 hover:bg-stone-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !subject.trim() || !description.trim()}
              className="flex-1 px-4 py-2 rounded-xl bg-rose-600 text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-rose-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <><Send size={13} /> Submit Report</>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
