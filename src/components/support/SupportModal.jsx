import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Button, Input } from '@/components/ui'
import { Headphones, X, Send, Sparkles, AlertCircle } from 'lucide-react'

const CATEGORIES = [
  { value: 'technical_bug', label: '🐛 Technical Bug / App Glitch' },
  { value: 'account_access', label: '🔑 Account & Login Assistance' },
  { value: 'listing_assistance', label: '📋 Listing & Verification Help' },
  { value: 'general_inquiry', label: '💬 General Inquiry / Feedback' },
]

export default function SupportModal({ isOpen, onClose }) {
  const { user, submitSupportTicket } = useAuthStore()
  const { addToast } = useAppStore()

  const [category, setCategory] = useState('technical_bug')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [priority, setPriority] = useState('normal')
  const [submitting, setSubmitting] = useState(false)

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
      addToast('Support ticket sent to Customer Service! We will respond shortly.', 'success')
      setSubject('')
      setMessage('')
      onClose()
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
        className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/15 shadow-2xl flex flex-col z-10 overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300">
              <Headphones size={18} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                Contact Customer Service
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Get assistance from SmartStay system administrators
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          
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
              placeholder="e.g., Cannot upload barangay permit / App not loading"
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

      </div>
    </div>,
    document.body
  )
}
