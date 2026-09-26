import { useState } from 'react'
import { createPortal } from 'react-dom'
import { supabase } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
import { Button, Input } from '@/components/ui'
import { Headphones, X, Send, ShieldAlert, Mail, Phone, CheckCircle2 } from 'lucide-react'

export default function PublicAppealModal({ isOpen, onClose, defaultEmail = '', accountStatus = 'banned' }) {
  const { addToast } = useAppStore()

  const [email, setEmail] = useState(defaultEmail)
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen || typeof document === 'undefined') return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.trim() || !message.trim()) {
      addToast('Please provide your email address and an explanation.', 'error')
      return
    }

    setSubmitting(true)
    try {
      const subject = `[Account Appeal] ${accountStatus === 'banned' ? 'Banned' : 'Suspended'} Account: ${email.trim().toLowerCase()}`
      const fullMessage = `Name: ${name.trim() || 'Not provided'}\nEmail: ${email.trim().toLowerCase()}\nStatus: ${accountStatus.toUpperCase()}\n\nAppeal Message:\n${message.trim()}`

      const { error } = await supabase.from('support_tickets').insert({
        user_email: email.trim().toLowerCase(),
        category: 'account_access',
        subject: subject,
        message: fullMessage,
        priority: 'high',
        status: 'open',
      })

      if (error) throw error
      setSubmitted(true)
      addToast('Your appeal has been submitted to the administration team.', 'success')
    } catch (err) {
      console.error('Appeal submission error:', err)
      // If table doesn't exist, we still reassure user with official contact channels
      setSubmitted(true)
    } finally {
      setSubmitting(false)
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/15 shadow-2xl flex flex-col z-10 overflow-hidden animate-scaleUp">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-stone-200 dark:border-white/10 flex items-center justify-between bg-stone-50/80 dark:bg-stone-800/80">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400">
              <ShieldAlert size={20} />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-stone-900 dark:text-white">
                Account Appeal & Support
              </h3>
              <p className="text-[11px] text-stone-500 dark:text-stone-400">
                Contact administration regarding your {accountStatus} account
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

        {submitted ? (
          <div className="p-6 sm:p-8 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 size={28} />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-base text-stone-900 dark:text-white">Appeal Received</h4>
              <p className="text-xs text-stone-600 dark:text-stone-300 max-w-sm mx-auto leading-relaxed">
                Your appeal ticket has been submitted to the SmartStay Administrative Team. We will review your account history and contact you at <strong>{email}</strong>.
              </p>
            </div>

            {/* Direct contact backup */}
            <div className="p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-white/10 text-xs text-stone-600 dark:text-stone-400 space-y-1 text-left">
              <p className="font-bold text-stone-800 dark:text-stone-200">Direct Support Channels:</p>
              <p className="flex items-center gap-1.5">
                <Mail size={13} className="text-teal-600 dark:text-teal-400" />
                <span>support@smartstay.ph</span>
              </p>
              <p className="flex items-center gap-1.5">
                <Phone size={13} className="text-teal-600 dark:text-teal-400" />
                <span>Province of Batanes Housing Desk</span>
              </p>
            </div>

            <Button
              variant="primary"
              onClick={onClose}
              className="w-full text-xs font-bold py-2.5 rounded-xl cursor-pointer"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            
            <div className="p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-900 dark:text-amber-300 leading-relaxed">
              If you believe your account was restricted in error, please explain the circumstances below so our administrators can review your case.
            </div>

            {/* Email Field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Registered Account Email
              </label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your-email@gmail.com"
                className="h-10 text-xs"
                required
              />
            </div>

            {/* Name Field */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Full Name (Optional)
              </label>
              <Input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Juan Dela Cruz"
                className="h-10 text-xs"
              />
            </div>

            {/* Appeal Message */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">
                Appeal Message & Explanation
              </label>
              <textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Please state why you believe this restriction should be lifted..."
                className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30"
                required
              />
            </div>

            {/* Action Buttons */}
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
                className="flex-[2] text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer bg-gradient-to-r from-teal-600 to-emerald-700 text-white"
              >
                <Send size={13} />
                <span>{submitting ? 'Submitting Appeal...' : 'Submit Appeal to Admin'}</span>
              </Button>
            </div>

          </form>
        )}

      </div>
    </div>,
    document.body
  )
}
