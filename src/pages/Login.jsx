import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import AuthModal from '@/components/ui/AuthModal'
import PublicAppealModal from '@/components/support/PublicAppealModal'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { Mail, Lock, Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react'
import SmartStayLogo from '@/components/ui/SmartStayLogo'

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading, authError, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [emailUnconfirmed, setEmailUnconfirmed] = useState(false)
  const [resendStatus, setResendStatus] = useState('')
  const [modalType, setModalType] = useState(null)
  const [statusReason, setStatusReason] = useState('')
  const [appealModalOpen, setAppealModalOpen] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEmailUnconfirmed(false)
    setResendStatus('')
    setModalType(null)
    setStatusReason('')
    const result = await login(email, password)
    if (result.success) {
      const role = result.user?.role
      if (role === 'admin') navigate('/admin')
      else if (role === 'owner') navigate('/owner')
      else navigate('/tenant')
    } else if (result.authError?.toLowerCase().includes('email not confirmed')) {
      setEmailUnconfirmed(true)
      setModalType('email_unconfirmed')
    } else if (result.authError === 'banned' || result.authError?.toLowerCase().includes('banned')) {
      setStatusReason(result.statusReason || '')
      setModalType('banned')
    } else if (result.authError === 'suspended' || result.authError?.toLowerCase().includes('suspended')) {
      setStatusReason(result.statusReason || '')
      setModalType('suspended')
    }
  }

  const handleResend = async () => {
    setResendStatus('sending')
    const { error } = await supabase.auth.resend({ type: 'signup', email: email.trim().toLowerCase() })
    setResendStatus(error ? 'error' : 'sent')
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-stone-100 dark:bg-stone-950 transition-colors duration-300">
      {/* ── Top-Right Floating Theme Toggle ── */}
      <div className="fixed top-4 right-4 sm:top-6 sm:right-6 z-50">
        <div className="p-1 rounded-2xl bg-white/80 dark:bg-stone-800/80 backdrop-blur-xl border border-stone-200/80 dark:border-white/10 shadow-lg hover:shadow-xl transition-all duration-200">
          <ThemeToggle />
        </div>
      </div>

      {/* ── Rich Scenic Background Gradients ── */}
      {/* Light Mode Gradient */}
      <div 
        className="absolute inset-0 z-0 dark:hidden opacity-90"
        style={{
          background: `
            radial-gradient(circle at 15% 15%, rgba(15, 110, 86, 0.15) 0%, transparent 45%),
            radial-gradient(circle at 85% 20%, rgba(83, 74, 183, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 50% 85%, rgba(186, 117, 23, 0.12) 0%, transparent 50%),
            linear-gradient(145deg, #e6f4ef 0%, #ece9f8 45%, #fdf4e3 100%)
          `
        }}
      />

      {/* Dark Mode Gradient */}
      <div 
        className="absolute inset-0 z-0 hidden dark:block"
        style={{
          background: `
            radial-gradient(circle at 15% 20%, rgba(15, 110, 86, 0.45) 0%, transparent 45%),
            radial-gradient(circle at 85% 25%, rgba(83, 74, 183, 0.4) 0%, transparent 45%),
            radial-gradient(circle at 50% 85%, rgba(186, 117, 23, 0.3) 0%, transparent 50%),
            linear-gradient(145deg, #091a15 0%, #0d111d 50%, #171109 100%)
          `
        }}
      />

      {/* Floating Animated Mesh Ambient Glow Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[450px] h-[450px] rounded-full bg-teal-500/20 dark:bg-teal-500/20 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-amber-400/20 dark:bg-amber-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] right-[15%] w-[350px] h-[350px] rounded-full bg-purple-400/20 dark:bg-indigo-500/20 blur-[100px] pointer-events-none" />

      {/* Subtle Dot Grid Accent */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* ── Main Login Container ── */}
      <div className="relative z-10 w-full max-w-[440px] space-y-6">
        
        {/* Brand Header */}
        <div className="text-center select-none flex flex-col items-center justify-center pb-1">
          <SmartStayLogo size="lg" className="hover:scale-105 transition-transform duration-300 drop-shadow-md" />
        </div>

        {/* Glassmorphism Card */}
        <div className="bg-white/85 dark:bg-stone-900/85 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-white/10 shadow-2xl shadow-stone-900/10 dark:shadow-black/60 relative overflow-hidden transition-colors duration-300">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-500" />

          <div className="mb-6">
            <h2 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">
              Sign in to your account
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
              Access your bookings, boarding houses, and profile
            </p>
          </div>

          {/* Significant account-level events → modal */}
          <AuthModal
            type={modalType}
            isOpen={!!modalType}
            onClose={() => { setModalType(null); setEmailUnconfirmed(false); setStatusReason('') }}
            email={email}
            statusReason={statusReason}
            onResend={handleResend}
            resendStatus={resendStatus}
            onContactSupport={() => setAppealModalOpen(true)}
          />

          <PublicAppealModal
            isOpen={appealModalOpen}
            onClose={() => setAppealModalOpen(false)}
            defaultEmail={email}
            accountStatus={modalType || 'restricted'}
            statusReason={statusReason}
          />

          {/* Simple form errors inline */}
          {!emailUnconfirmed && authError && !authError.toLowerCase().includes('banned') && !authError.toLowerCase().includes('suspended') && (
            <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl p-3.5 mb-5 text-xs text-red-700 dark:text-red-200 flex items-start gap-2.5 animate-fadeIn">
              <span className="text-red-500 dark:text-red-400 text-sm">⚠️</span>
              <span className="leading-relaxed">{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Email Address
              </label>
              <div className="relative">
                <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { clearError(); setEmail(e.target.value) }}
                  placeholder="you@smartstay.ph"
                  required
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800/90 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-400/25 transition-all shadow-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                Password
              </label>
              <div className="relative">
                <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { clearError(); setPassword(e.target.value) }}
                  placeholder="••••••••"
                  required
                  className="w-full pl-10 pr-10 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800/90 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-400/25 transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1 transition-colors"
                  aria-label={showPw ? "Hide password" : "Show password"}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-gradient-to-r from-teal-600 via-teal-700 to-emerald-700 hover:from-teal-500 hover:to-emerald-600 text-white font-bold text-sm shadow-lg shadow-teal-900/20 dark:shadow-teal-950/40 hover:shadow-teal-900/35 active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in…</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Bottom link to Register */}
          <div className="mt-6 pt-5 border-t border-stone-200 dark:border-stone-800 text-center">
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Don't have an account yet?{' '}
              <Link 
                to="/register" 
                className="font-bold text-teal-700 dark:text-teal-400 hover:underline transition-colors ml-1"
              >
                Register here
              </Link>
            </p>
          </div>
        </div>

        {/* Security badge & copyright footer */}
        <div className="text-center space-y-2 select-none">
          <div className="inline-flex items-center gap-1.5 text-[11px] text-stone-500 dark:text-stone-400 font-medium">
            <ShieldCheck size={14} className="text-teal-600 dark:text-teal-400" />
            <span>Secure Batanes Housing Network</span>
          </div>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            © {new Date().getFullYear()} SmartStay • Province of Batanes
          </p>
        </div>

      </div>
    </div>
  )
}
