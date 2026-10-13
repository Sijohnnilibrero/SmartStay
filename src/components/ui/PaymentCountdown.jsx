import { useState, useEffect } from 'react'
import { Clock, AlertTriangle, CheckCircle2 } from 'lucide-react'

/**
 * Calculates deadline: payment_deadline column OR updated_at/created_at + 24 hours.
 */
export function getPaymentDeadline(reservation) {
  if (!reservation) return null
  if (reservation.payment_deadline) return new Date(reservation.payment_deadline)
  const baseTime = new Date(reservation.updated_at || reservation.created_at).getTime()
  return new Date(baseTime + 24 * 60 * 60 * 1000)
}

/**
 * Checks if a reservation has passed its payment deadline without a receipt upload.
 */
export function isPaymentExpired(reservation) {
  if (!reservation || reservation.status !== 'awaiting_payment') return false
  if (reservation.payment_receipt_url) return false // Receipt uploaded, homeowner reviewing
  const deadline = getPaymentDeadline(reservation)
  return deadline ? Date.now() > deadline.getTime() : false
}

/**
 * Live Countdown Timer for Awaiting Payment reservations.
 */
export default function PaymentCountdown({ reservation, compact = false, onExpire }) {
  const [timeLeft, setTimeLeft] = useState(null)
  const [isExpired, setIsExpired] = useState(false)

  const hasReceipt = !!reservation?.payment_receipt_url

  useEffect(() => {
    if (!reservation || reservation.status !== 'awaiting_payment') return

    // If tenant already uploaded a receipt, the countdown is paused/complete
    if (hasReceipt) {
      setIsExpired(false)
      return
    }

    const deadline = getPaymentDeadline(reservation)
    if (!deadline) return

    function calculate() {
      const now = Date.now()
      const diff = deadline.getTime() - now

      if (diff <= 0) {
        setIsExpired(true)
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0, totalHours: 0 })
        if (onExpire) onExpire()
      } else {
        setIsExpired(false)
        const hours = Math.floor(diff / (1000 * 60 * 60))
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
        const seconds = Math.floor((diff % (1000 * 60)) / 1000)
        setTimeLeft({ hours, minutes, seconds, totalHours: diff / (1000 * 60 * 60) })
      }
    }

    calculate()
    const timer = setInterval(calculate, 1000)
    return () => clearInterval(timer)
  }, [reservation?.id, reservation?.status, reservation?.payment_deadline, reservation?.updated_at, hasReceipt])

  if (!reservation || reservation.status !== 'awaiting_payment') return null

  // If receipt is already uploaded, show green badge
  if (hasReceipt) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 dark:bg-teal-950/60 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
        <CheckCircle2 size={11} /> Receipt Uploaded
      </span>
    )
  }

  if (isExpired) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
        ⌛ Expired (Unpaid)
      </span>
    )
  }

  if (!timeLeft) return null

  const isUrgent = timeLeft.totalHours < 6

  if (compact) {
    return (
      <span
        title="Time remaining to pay and upload proof of payment before reservation automatically expires."
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all select-none ${
          isUrgent
            ? 'bg-rose-50 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300 border-rose-300 dark:border-rose-800 shadow-xs ring-1 ring-rose-400/20 animate-pulse'
            : 'bg-amber-50 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800 shadow-xs'
        }`}
      >
        <Clock size={11} className={isUrgent ? 'animate-spin' : ''} />
        <span>{timeLeft.hours}h {timeLeft.minutes}m {timeLeft.seconds}s</span>
      </span>
    )
  }

  return (
    <div className={`p-2.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
      isUrgent
        ? 'bg-rose-50 dark:bg-rose-950/50 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200'
        : 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
    }`}>
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${isUrgent ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-600' : 'bg-amber-100 dark:bg-amber-900/50 text-amber-600'}`}>
          <Clock size={15} />
        </div>
        <div>
          <p className="font-bold leading-tight">
            {isUrgent ? 'Payment Window Closing Soon!' : '24h Payment Window'}
          </p>
          <p className="text-[10px] opacity-80">
            Upload receipt before deadline to secure this room.
          </p>
        </div>
      </div>
      <div className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-white dark:bg-stone-900 shadow-xs border border-current/20">
        {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
      </div>
    </div>
  )
}
