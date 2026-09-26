import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import AuthModal from '@/components/ui/AuthModal'
import ThemeToggle from '@/components/layout/ThemeToggle'
import { User, Mail, Phone, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, ShieldCheck, CheckCircle2 } from 'lucide-react'
import SmartStayLogo from '@/components/ui/SmartStayLogo'

const ROLE_OPTIONS = [
  {
    value: 'tenant',
    label: 'Tenant / Tourist / Boarder',
    desc: 'I am looking for a boarding house or transient room.',
    icon: '🎒',
    color: '#0F6E56',
    border: 'border-teal-500/50',
    bgActive: 'bg-teal-50 dark:bg-teal-950/60 border-teal-500 dark:border-teal-400',
  },
  {
    value: 'owner',
    label: 'Homeowner',
    desc: 'I own a boarding house and want to list it for rent.',
    icon: '🏠',
    color: '#BA7517',
    border: 'border-amber-500/50',
    bgActive: 'bg-amber-50 dark:bg-amber-950/60 border-amber-500 dark:border-amber-400',
  },
]

const TENANT_TYPES = [
  { value: 'student',             label: 'Student' },
  { value: 'professional',        label: 'Professional' },
  { value: 'government_employee', label: 'Government Employee' },
  { value: 'visitor',             label: 'Visitor / Tourist / Transient' },
]

export default function Register() {
  const navigate = useNavigate()
  const { register, isLoading } = useAuthStore()

  const [step, setStep] = useState(1)
  const [role, setRole] = useState('')
  const [form, setForm] = useState({
    name: '', email: '', contact: '', password: '', confirmPw: '',
    tenantType: 'student', propertyName: '', municipality: 'Basco',
  })
  const [errors, setErrors] = useState({})
  const [showPw, setShowPw] = useState(false)
  const [modalType, setModalType] = useState(null)
  const [registerError, setRegisterError] = useState('')

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const validateStep2 = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Full name is required.'
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(form.email)) e.email = 'Enter a valid email address (e.g. name@gmail.com).'
    if (!form.contact.trim()) {
      e.contact = 'Contact number is required.'
    } else if (!/^(09|\+639)\d{9}$|^[0-9+() -]{7,15}$/.test(form.contact.trim())) {
      e.contact = 'Enter a valid contact number (e.g. 09123456789).'
    }
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPw) e.confirmPw = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async (e) => {
    e.preventDefault()
    setRegisterError('')
    if (!validateStep2()) return

    const result = await register({
      email: form.email,
      password: form.password,
      name: form.name,
      contact: form.contact.trim(),
      role: role,
      tenantType: form.tenantType,
      municipality: role === 'tenant' ? form.municipality : 'Basco',
    })

    if (result.success) {
      setModalType(result.needsConfirmation ? 'account_created' : 'account_created_instant')
    } else {
      setRegisterError(result.authError || 'Registration failed. Please try again.')
    }
  }

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 sm:p-6 overflow-hidden bg-stone-100 dark:bg-stone-950 font-sans transition-colors duration-300">
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
            radial-gradient(circle at 85% 15%, rgba(15, 110, 86, 0.15) 0%, transparent 45%),
            radial-gradient(circle at 15% 30%, rgba(83, 74, 183, 0.12) 0%, transparent 45%),
            radial-gradient(circle at 50% 90%, rgba(186, 117, 23, 0.12) 0%, transparent 50%),
            linear-gradient(145deg, #e6f4ef 0%, #ece9f8 45%, #fdf4e3 100%)
          `
        }}
      />

      {/* Dark Mode Gradient */}
      <div 
        className="absolute inset-0 z-0 hidden dark:block"
        style={{
          background: `
            radial-gradient(circle at 85% 15%, rgba(15, 110, 86, 0.45) 0%, transparent 45%),
            radial-gradient(circle at 15% 30%, rgba(83, 74, 183, 0.4) 0%, transparent 45%),
            radial-gradient(circle at 50% 90%, rgba(186, 117, 23, 0.3) 0%, transparent 50%),
            linear-gradient(145deg, #091a15 0%, #0d111d 50%, #171109 100%)
          `
        }}
      />

      {/* Floating Animated Mesh Ambient Orbs */}
      <div className="absolute top-[-10%] right-[-10%] w-[450px] h-[450px] rounded-full bg-teal-500/20 blur-[100px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-amber-400/20 dark:bg-amber-500/15 blur-[120px] pointer-events-none" />
      <div className="absolute top-[35%] left-[20%] w-[350px] h-[350px] rounded-full bg-purple-400/20 dark:bg-indigo-500/20 blur-[100px] pointer-events-none" />

      {/* Subtle Dot Grid Accent */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] dark:opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(currentColor 1px, transparent 1px)`,
          backgroundSize: '24px 24px'
        }}
      />

      {/* ── Main Container ── */}
      <div className="relative z-10 w-full max-w-[480px] space-y-6">
        
        {/* Brand Header */}
        <div className="text-center space-y-2 select-none flex flex-col items-center">
          <SmartStayLogo variant="icon" size="lg" className="hover:scale-105 transition-transform duration-300 drop-shadow-md mb-1" />
          <div className="space-y-0.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-stone-900 dark:text-white tracking-tight">
              Create an Account
            </h1>
            <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-300 font-medium">
              Join SmartStay Batanes Housing Network
            </p>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center justify-center gap-3 select-none">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
              step >= 1 ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-stone-200 dark:bg-stone-800 text-stone-500 border border-stone-300 dark:border-stone-700'
            }`}>
              1
            </div>
            <span className={`text-xs font-semibold ${step >= 1 ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400 dark:text-stone-500'}`}>
              Account Type
            </span>
          </div>

          <div className={`w-12 h-0.5 rounded-full transition-colors ${step > 1 ? 'bg-teal-600 dark:bg-teal-500' : 'bg-stone-300 dark:bg-stone-800'}`} />

          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
              step >= 2 ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-lg shadow-teal-500/30' : 'bg-stone-200 dark:bg-stone-800 text-stone-500 border border-stone-300 dark:border-stone-700'
            }`}>
              2
            </div>
            <span className={`text-xs font-semibold ${step >= 2 ? 'text-teal-700 dark:text-teal-300' : 'text-stone-400 dark:text-stone-500'}`}>
              Your Details
            </span>
          </div>
        </div>

        {/* Glassmorphism Card */}
        <div className="bg-white/85 dark:bg-stone-900/85 backdrop-blur-2xl rounded-3xl p-6 sm:p-8 border border-white/90 dark:border-white/10 shadow-2xl shadow-stone-900/10 dark:shadow-black/60 relative overflow-hidden transition-colors duration-300">
          {/* Top highlight bar */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-400 to-amber-500" />

          {/* Error Message */}
          {registerError && (
            <div className="bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/80 rounded-xl p-3.5 mb-5 text-xs text-red-700 dark:text-red-200 flex items-start gap-2.5 animate-fadeIn">
              <span className="text-red-500 dark:text-red-400 text-sm">⚠️</span>
              <span className="leading-relaxed">{registerError}</span>
            </div>
          )}

          {/* Account created modal */}
          <AuthModal
            type={modalType}
            isOpen={!!modalType}
            onClose={() => navigate('/login')}
            email={form.email}
          />

          {/* STEP 1: Choose Role */}
          {step === 1 && (
            <div className="space-y-5 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">
                  Who are you?
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Choose your role to customize your experience
                </p>
              </div>

              <div className="space-y-3">
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`w-full p-4 rounded-2xl text-left transition-all duration-200 border flex items-center gap-4 cursor-pointer select-none ${
                      role === opt.value
                        ? `${opt.bgActive} border-2 shadow-md`
                        : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/70 hover:bg-white dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600'
                    }`}
                  >
                    <span className="text-3xl p-2 rounded-xl bg-white dark:bg-stone-800/80 border border-stone-200 dark:border-white/5 shadow-sm">{opt.icon}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold truncate ${role === opt.value ? 'text-teal-900 dark:text-white' : 'text-stone-900 dark:text-stone-200'}`}>
                        {opt.label}
                      </p>
                      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-2">
                        {opt.desc}
                      </p>
                    </div>
                    {role === opt.value && (
                      <CheckCircle2 size={20} className="text-teal-600 dark:text-teal-400 flex-shrink-0" />
                    )}
                  </button>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ArrowLeft size={14} />
                  <span>Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => { if (role) setStep(2) }}
                  disabled={!role}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-teal-900/20 dark:shadow-teal-950/40 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Continue</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Details Form */}
          {step === 2 && (
            <form onSubmit={handleRegister} className="space-y-4 animate-fadeIn">
              <div>
                <h2 className="text-lg font-bold text-stone-900 dark:text-white tracking-tight">
                  Your details
                </h2>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                  Creating {role === 'tenant' ? 'Tenant' : 'Homeowner'} account
                </p>
              </div>

              {/* Full Name */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Full Name
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Juan dela Cruz"
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800/90 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border ${
                      errors.name ? 'border-red-500 focus:ring-red-400/25' : 'border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500/20 dark:focus:ring-teal-400/25'
                    } focus:outline-none focus:ring-2 transition-all shadow-sm`}
                  />
                </div>
                {errors.name && <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">{errors.name}</p>}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Email Address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => set('email', e.target.value)}
                    placeholder="juan@email.com"
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800/90 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border ${
                      errors.email ? 'border-red-500 focus:ring-red-400/25' : 'border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500/20 dark:focus:ring-teal-400/25'
                    } focus:outline-none focus:ring-2 transition-all shadow-sm`}
                  />
                </div>
                {errors.email && <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">{errors.email}</p>}
              </div>

              {/* Contact */}
              <div className="space-y-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                  Contact Number
                </label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
                  <input
                    type="tel"
                    value={form.contact}
                    onChange={(e) => set('contact', e.target.value)}
                    placeholder="09123456789"
                    className={`w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800/90 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border ${
                      errors.contact ? 'border-red-500 focus:ring-red-400/25' : 'border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400 focus:ring-teal-500/20 dark:focus:ring-teal-400/25'
                    } focus:outline-none focus:ring-2 transition-all shadow-sm`}
                  />
                </div>
                {errors.contact && <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">{errors.contact}</p>}
              </div>

              {/* Passwords (2 Columns) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPw ? 'text' : 'password'}
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                      placeholder="Min. 6 chars"
                      className={`w-full pl-3 pr-8 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800/90 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border ${
                        errors.password ? 'border-red-500' : 'border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400'
                      } focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-400/25 transition-all shadow-sm`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 p-1"
                    >
                      {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                  {errors.password && <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">{errors.password}</p>}
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={form.confirmPw}
                    onChange={(e) => set('confirmPw', e.target.value)}
                    placeholder="Repeat password"
                    className={`w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800/90 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border ${
                      errors.confirmPw ? 'border-red-500' : 'border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400'
                    } focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-400/25 transition-all shadow-sm`}
                  />
                  {errors.confirmPw && <p className="text-[10px] text-red-500 dark:text-red-400 mt-1">{errors.confirmPw}</p>}
                </div>
              </div>

              {/* Role-specific fields */}
              {role === 'tenant' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      Tenant Classification
                    </label>
                    <select
                      value={form.tenantType}
                      onChange={(e) => set('tenantType', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-400/25 shadow-sm"
                    >
                      {TENANT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-700 dark:text-stone-300">
                      Target Municipality
                    </label>
                    <select
                      value={form.municipality}
                      onChange={(e) => set('municipality', e.target.value)}
                      className="w-full px-3 py-2.5 text-sm rounded-xl bg-white dark:bg-stone-800 text-stone-900 dark:text-white border border-stone-300 dark:border-stone-700/80 focus:border-teal-500 dark:focus:border-teal-400 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:focus:ring-teal-400/25 shadow-sm"
                    >
                      {['Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Itbayat', 'Sabtang'].map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-800 text-stone-700 dark:text-stone-300 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <ArrowLeft size={14} />
                  <span>Back</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="flex-[2] py-2.5 px-4 rounded-xl bg-gradient-to-r from-teal-600 to-emerald-600 hover:from-teal-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold shadow-lg shadow-teal-900/20 dark:shadow-teal-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Creating Account…</span>
                    </div>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Bottom link to Login */}
          <div className="mt-6 pt-5 border-t border-stone-200 dark:border-stone-800 text-center">
            <p className="text-xs text-stone-600 dark:text-stone-400">
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-bold text-teal-700 dark:text-teal-400 hover:underline transition-colors ml-1"
              >
                Sign in
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
