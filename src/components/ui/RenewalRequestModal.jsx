import React, { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Calendar, Plus, Minus, ArrowRight, ShieldCheck, Clock } from 'lucide-react'
import useScrollLock from '@/hooks/useScrollLock'
import { Button } from './index'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'

export default function RenewalRequestModal({ isOpen, onClose, reservation, room, property, onSuccess }) {
  useScrollLock(isOpen)

  const [months, setMonths] = useState(3)
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const requestLeaseRenewal = useAuthStore((s) => s.requestLeaseRenewal)
  const addToast = useAppStore((s) => s.addToast)

  if (!isOpen || !reservation) return null

  const currentMonths = reservation.duration_months || 1
  const monthlyRent = reservation.amount_total ? (reservation.amount_total / currentMonths) : (room?.price_monthly || 0)
  const additionalCost = monthlyRent * months

  // Current Expiry
  let currentExpiryStr = '—'
  let newExpiryStr = '—'

  if (reservation.check_in) {
    const curDate = new Date(reservation.check_in)
    curDate.setMonth(curDate.getMonth() + currentMonths)
    currentExpiryStr = curDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })

    const newDate = new Date(reservation.check_in)
    newDate.setMonth(newDate.getMonth() + currentMonths + months)
    newExpiryStr = newDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const presets = [1, 3, 6, 12]

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (months < 1) {
      addToast('Please select at least 1 month extension.', 'error')
      return
    }

    setSubmitting(true)
    try {
      await requestLeaseRenewal(reservation.id, months, notes.trim())
      addToast('Lease extension request sent to your landlord!', 'success')
      if (onSuccess) onSuccess()
      onClose()
    } catch (err) {
      console.error('Failed to request renewal:', err)
      addToast('Failed to submit renewal request: ' + (err.message || 'Unknown error'), 'error')
    } finally {
      setSubmitting(false)
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
            <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-900/40 text-[--teal] dark:text-teal-400 flex items-center justify-center">
              <Calendar size={18} />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 dark:text-stone-100">Request Lease Extension</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {property?.name || 'Property'} • Room {room?.room_number || reservation.room_id?.slice(0, 4)}
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
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {/* Current Contract Status Pill */}
          <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200/60 dark:border-stone-700/60 grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-medium">Current Expiry</span>
              <span className="font-semibold text-stone-700 dark:text-stone-200">{currentExpiryStr}</span>
            </div>
            <div>
              <span className="text-stone-400 block text-[10px] uppercase font-medium">Monthly Rent</span>
              <span className="font-semibold text-[--teal]">{formatCurrency(monthlyRent)}</span>
            </div>
          </div>

          {/* Extension Duration Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
              Select Extension Length
            </label>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {presets.map((m) => (
                <button
                  type="button"
                  key={m}
                  onClick={() => setMonths(m)}
                  className={`py-2 px-2 text-xs font-semibold rounded-xl border transition-all ${
                    months === m
                      ? 'bg-[--teal] text-white border-[--teal] shadow-xs'
                      : 'bg-white dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700 hover:border-teal-400'
                  }`}
                >
                  +{m} {m === 1 ? 'Month' : 'Months'}
                </button>
              ))}
            </div>

            {/* Stepper for custom months */}
            <div className="flex items-center justify-between p-2.5 bg-stone-50 dark:bg-stone-800/40 rounded-xl border border-stone-200 dark:border-stone-700">
              <span className="text-xs text-stone-600 dark:text-stone-400">Custom Extension:</span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMonths(Math.max(1, months - 1))}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 disabled:opacity-40"
                  disabled={months <= 1}
                >
                  <Minus size={14} />
                </button>
                <span className="text-sm font-bold text-stone-800 dark:text-stone-100 min-w-[3rem] text-center">
                  {months} {months === 1 ? 'month' : 'months'}
                </span>
                <button
                  type="button"
                  onClick={() => setMonths(Math.min(24, months + 1))}
                  className="w-7 h-7 rounded-lg bg-white dark:bg-stone-700 border border-stone-200 dark:border-stone-600 flex items-center justify-center text-stone-600 dark:text-stone-300 hover:bg-stone-100 disabled:opacity-40"
                  disabled={months >= 24}
                >
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* Projection Summary Card */}
          <div className="p-3.5 bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400">New Proposed Expiry:</span>
              <span className="font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                {newExpiryStr}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-stone-500 dark:text-stone-400">Total Duration After Extension:</span>
              <span className="font-semibold text-stone-700 dark:text-stone-300">
                {currentMonths + months} months (+{months} mos)
              </span>
            </div>
            <div className="flex items-center justify-between text-xs pt-1.5 border-t border-teal-100/60 dark:border-teal-900/30">
              <span className="text-stone-500 dark:text-stone-400">Estimated Additional Rent:</span>
              <span className="font-bold text-stone-900 dark:text-stone-100">
                {formatCurrency(additionalCost)}
              </span>
            </div>
          </div>

          {/* Notes Input */}
          <div>
            <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
              Message to Landlord <span className="text-stone-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., I'd like to extend my stay for the upcoming semester. Thank you!"
              rows={2}
              className="w-full text-xs p-2.5 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[--teal]"
            />
          </div>

          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-[11px] text-amber-800 dark:text-amber-300">
            <Clock size={15} className="flex-shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
            <span>
              Your request will be submitted to the landlord for approval. You will be notified as soon as they review it.
            </span>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2.5 border-t border-stone-100 dark:border-stone-800">
            <Button
              type="button"
              variant="default"
              size="sm"
              onClick={onClose}
              disabled={submitting}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={submitting}
              className="text-xs flex items-center gap-1.5"
            >
              {submitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <>
                  <span>Send Extension Request</span>
                  <ArrowRight size={13} />
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  )
}
