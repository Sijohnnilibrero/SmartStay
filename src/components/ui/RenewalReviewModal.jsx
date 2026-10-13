import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Check, XCircle, Calendar, ArrowRight, User, AlertCircle, FileText } from 'lucide-react'
import useScrollLock from '@/hooks/useScrollLock'
import { Button } from './index'
import { formatCurrency, parseRenewalData } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'

export default function RenewalReviewModal({ isOpen, onClose, tenant, onSuccess }) {
  useScrollLock(isOpen)

  const [declineReason, setDeclineReason] = useState('')
  const [showDeclineInput, setShowDeclineInput] = useState(false)
  const [actioning, setActioning] = useState(false)
  const respondLeaseRenewal = useAuthStore((s) => s.respondLeaseRenewal)
  const addToast = useAppStore((s) => s.addToast)

  if (!isOpen || !tenant) return null

  const renewalData = parseRenewalData(tenant.reservation || tenant)
  const months = renewalData.months || 1
  const currentMonths = tenant.duration_months || 1
  const monthlyRent = tenant.amount_total ? (tenant.amount_total / currentMonths) : (tenant.room_price || 0)
  const additionalCost = monthlyRent * months

  // Current Expiry vs New Expiry
  let currentExpiryStr = '—'
  let newExpiryStr = '—'

  if (tenant.check_in) {
    const curDate = new Date(tenant.check_in)
    curDate.setMonth(curDate.getMonth() + currentMonths)
    currentExpiryStr = curDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

    const newDate = new Date(tenant.check_in)
    newDate.setMonth(newDate.getMonth() + currentMonths + months)
    newExpiryStr = newDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const handleDecision = async (approve) => {
    if (!approve && !showDeclineInput) {
      setShowDeclineInput(true)
      return
    }

    setActioning(true)
    try {
      await respondLeaseRenewal(tenant.reservation_id, approve, declineReason.trim())
      addToast(
        approve 
          ? `Lease extended by +${months} months! Tenant notified.` 
          : 'Lease extension declined. Tenant notified.',
        approve ? 'success' : 'default'
      )
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to process renewal:', err)
      addToast('Failed to update renewal: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setActioning(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div 
        className="w-full max-w-lg bg-white dark:bg-stone-900 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between bg-stone-50/50 dark:bg-stone-900">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Review Lease Extension</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {tenant.full_name} • {tenant.property_name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          {/* Extension Request Callout */}
          <div className="p-3.5 bg-amber-50/70 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-amber-900 dark:text-amber-300">
                Extension Requested:
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-200 dark:bg-amber-800 text-amber-900 dark:text-amber-100">
                +{months} {months === 1 ? 'Month' : 'Months'}
              </span>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300/80">
              {tenant.full_name} requested to extend their lease from <strong>{currentExpiryStr}</strong> to <strong>{newExpiryStr}</strong>.
            </p>
          </div>

          {/* Tenant Note (if present) */}
          {renewalData.notes && (
            <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/60 dark:border-stone-700/60">
              <span className="text-[10px] uppercase font-semibold text-stone-400 tracking-wider block mb-1 flex items-center gap-1">
                <FileText size={11} /> Tenant's Message
              </span>
              <p className="text-xs text-stone-700 dark:text-stone-200 italic leading-relaxed">
                "{renewalData.notes}"
              </p>
            </div>
          )}

          {/* Detailed Contract Comparison */}
          <div className="space-y-2 border border-stone-100 dark:border-stone-800 rounded-xl p-3 bg-stone-50/40 dark:bg-stone-800/20">
            <div className="flex items-center justify-between text-xs py-1 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500 dark:text-stone-400">Current Lease Duration:</span>
              <span className="font-semibold text-stone-800 dark:text-stone-200">{currentMonths} months</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500 dark:text-stone-400">Current Expiration:</span>
              <span className="font-medium text-stone-700 dark:text-stone-300">{currentExpiryStr}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1 border-b border-stone-100 dark:border-stone-800">
              <span className="text-stone-500 dark:text-stone-400">New Expiration if Approved:</span>
              <span className="font-bold text-[--teal]">{newExpiryStr}</span>
            </div>
            <div className="flex items-center justify-between text-xs py-1">
              <span className="text-stone-500 dark:text-stone-400">Additional Rent:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">{formatCurrency(additionalCost)}</span>
            </div>
          </div>

          {/* Decline Reason Input (shown when Decline clicked) */}
          {showDeclineInput && (
            <div className="p-3 bg-red-50/60 dark:bg-red-950/20 rounded-xl border border-red-200 dark:border-red-900/40 animate-in fade-in duration-150">
              <label className="block text-xs font-semibold text-red-900 dark:text-red-300 mb-1.5 flex items-center gap-1">
                <AlertCircle size={13} /> Reason for Declining <span className="text-red-600/70 font-normal">(Optional)</span>
              </label>
              <textarea
                value={declineReason}
                onChange={(e) => setDeclineReason(e.target.value)}
                placeholder="E.g., Property scheduled for maintenance / unavailable."
                rows={2}
                className="w-full text-xs p-2 rounded-lg border border-red-200 dark:border-red-900 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-red-400"
              />
              <p className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                This note will be included in the tenant's notification.
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onClose}
              disabled={actioning}
              className="text-xs"
            >
              Cancel
            </Button>

            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={() => handleDecision(false)}
              disabled={actioning}
              className="text-xs flex items-center gap-1.5"
            >
              <XCircle size={14} />
              <span>{showDeclineInput ? 'Confirm Decline' : 'Decline'}</span>
            </Button>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => handleDecision(true)}
              disabled={actioning}
              className="text-xs flex items-center gap-1.5"
            >
              {actioning ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  <Check size={14} />
                  <span>Approve (+{months} Mos)</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}
