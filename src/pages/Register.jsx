import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

const ROLE_OPTIONS = [
  {
    value: 'tenant',
    label: 'Tenant / Tourist / Boarder',
    desc: 'I am looking for a boarding house or transient room.',
    icon: '🎒',
    color: '#BA7517',
    bg: '#FAEEDA',
  },
  {
    value: 'owner',
    label: 'Homeowner',
    desc: 'I own a boarding house and want to list it.',
    icon: '🏠',
    color: '#0F6E56',
    bg: '#E1F5EE',
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

  const [step,     setStep]     = useState(1)  // 1 = role pick, 2 = details form
  const [role,     setRole]     = useState('')
  const [form,     setForm]     = useState({
    name: '', email: '', password: '', confirmPw: '',
    tenantType: 'student', propertyName: '', municipality: 'Basco',
  })
  const [errors,   setErrors]   = useState({})
  const [showPw,   setShowPw]   = useState(false)
const [success,  setSuccess]  = useState(false)
const [registerError, setRegisterError] = useState('')

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }))

  const validateStep2 = () => {
    const e = {}
    if (!form.name.trim())         e.name = 'Full name is required.'
    if (!form.email.includes('@')) e.email = 'Enter a valid email.'
    if (form.password.length < 6)  e.password = 'Password must be at least 6 characters.'
    if (form.password !== form.confirmPw) e.confirmPw = 'Passwords do not match.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleRegister = async (e) => {
  e.preventDefault()
  setRegisterError('')
  if (!validateStep2()) return

  const result = await register({
    email:        form.email,
    password:     form.password,
    name:         form.name,
    role:         role,
    tenantType:   form.tenantType,
    municipality: role === 'tenant' ? form.municipality : 'Basco',
  })

  if (result.success) {
    setSuccess(true)
    if (role === 'tenant') {
      // Clear onboarding flag for new user so they see the wizard
      // We don't know the ID yet so we'll let the login handle it
      setTimeout(() => navigate('/login'), 2200)
    } else {
      setTimeout(() => navigate('/login'), 2200)
    }
  } else {
    setRegisterError(result.authError || 'Registration failed. Please try again.')
  }
}

  const inputStyle = (err) => ({
    width: '100%', padding: '10px 12px', borderRadius: 8, boxSizing: 'border-box',
    border: `0.5px solid ${err ? '#D85A30' : '#d6d3ca'}`,
    fontSize: 13, color: '#1a1a18', background: '#fff', outline: 'none',
    fontFamily: 'inherit',
  })

  const labelStyle = {
    display: 'block', fontSize: 11, fontWeight: 500, color: '#5F5E5A',
    marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em',
  }

  return (
    <div style={{
      minHeight: '100vh', background: '#f5f4f0',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '24px', fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 460 }}>


        {/* Error message */}
        {registerError && (
          <div style={{
            background: '#FAECE7', border: '0.5px solid #D85A30',
            borderRadius: 8, padding: '10px 14px', marginBottom: 16,
            fontSize: 13, color: '#993C1D',
          }}>
            {registerError}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div style={{
            background: '#E1F5EE', border: '0.5px solid #1D9E75',
            borderRadius: 12, padding: '16px 20px', marginBottom: 20,
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 24, marginBottom: 6 }}>✅</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#085041' }}>
              Account created successfully!
            </p>
            <p style={{ fontSize: 12, color: '#0F6E56', marginTop: 4 }}>
              Redirecting you to the login page...
            </p>
          </div>
        )}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 13, background: '#0F6E56',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 10px', fontSize: 22,
          }}>🏠</div>
          <h1 className="text-[24px] text-[#1a1a18] m-0 font-bold">
            Create an account
          </h1>
          <p style={{ fontSize: 12, color: '#888780', marginTop: 4 }}>
            Already have one?{' '}
            <Link to="/login" style={{ color: '#0F6E56', fontWeight: 600, textDecoration: 'none' }}>
              Sign in
            </Link>
          </p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20, justifyContent: 'center' }}>
          {[1, 2].map((s) => (
            <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 26, height: 26, borderRadius: '50%', fontSize: 11, fontWeight: 600,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: step >= s ? '#0F6E56' : '#e5e2da',
                color: step >= s ? '#fff' : '#888780',
                transition: 'all 0.2s',
              }}>{s}</div>
              {s < 2 && <div style={{ width: 40, height: 1, background: step > s ? '#0F6E56' : '#e5e2da' }} />}
            </div>
          ))}
        </div>

        <div style={{
          background: '#fff', borderRadius: 16,
          border: '0.5px solid #e5e2da', padding: 28,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>

          {/* STEP 1: Choose role */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18', marginTop: 0, marginBottom: 6 }}>
                Who are you?
              </h2>
              <p style={{ fontSize: 13, color: '#888780', marginBottom: 20, marginTop: 0 }}>
                Choose your account type to get started.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                {ROLE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRole(opt.value)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
                      textAlign: 'left', fontFamily: 'inherit',
                      background: role === opt.value ? opt.bg : '#fff',
                      border: `${role === opt.value ? '1.5px' : '0.5px'} solid ${role === opt.value ? opt.color : '#e5e2da'}`,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 24 }}>{opt.icon}</span>
                    <div>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: role === opt.value ? opt.color : '#1a1a18' }}>
                        {opt.label}
                      </p>
                      <p style={{ margin: 0, fontSize: 12, color: '#888780', marginTop: 2 }}>{opt.desc}</p>
                    </div>
                    {role === opt.value && (
                      <span style={{ marginLeft: 'auto', fontSize: 16, color: opt.color }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  style={{
                    flex: 1, padding: 11, borderRadius: 8, fontSize: 14,
                    background: '#fff', border: '0.5px solid #d6d3ca',
                    color: '#5F5E5A', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ← Login
                </button>
                <button
                  onClick={() => { if (role) setStep(2) }}
                  disabled={!role}
                  style={{
                    flex: 2, padding: 11, borderRadius: 8,
                    background: role ? '#0F6E56' : '#d6d3ca',
                    color: '#fff', fontSize: 14, fontWeight: 600,
                    border: 'none', cursor: role ? 'pointer' : 'not-allowed',
                    fontFamily: 'inherit',
                  }}
                >
                  Continue →
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Details form */}
          {step === 2 && (
            <form onSubmit={handleRegister}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: '#1a1a18', marginTop: 0, marginBottom: 18 }}>
                Your details
              </h2>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Full Name</label>
                <input
                  style={inputStyle(errors.name)}
                  placeholder="Juan dela Cruz"
                  value={form.name}
                  onChange={(e) => set('name', e.target.value)}
                />
                {errors.name && <p style={{ fontSize: 11, color: '#D85A30', margin: '4px 0 0' }}>{errors.name}</p>}
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={labelStyle}>Email Address</label>
                <input
                  type="email"
                  style={inputStyle(errors.email)}
                  placeholder="juan@email.com"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                />
                {errors.email && <p style={{ fontSize: 11, color: '#D85A30', margin: '4px 0 0' }}>{errors.email}</p>}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPw ? 'text' : 'password'}
                      style={{ ...inputStyle(errors.password), paddingRight: 36 }}
                      placeholder="Min. 6 chars"
                      value={form.password}
                      onChange={(e) => set('password', e.target.value)}
                    />
                    <button type="button" onClick={() => setShowPw((v) => !v)} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13 }}>
                      {showPw ? '🙈' : '👁'}
                    </button>
                  </div>
                  {errors.password && <p style={{ fontSize: 11, color: '#D85A30', margin: '4px 0 0' }}>{errors.password}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Confirm Password</label>
                  <input
                    type="password"
                    style={inputStyle(errors.confirmPw)}
                    placeholder="Repeat password"
                    value={form.confirmPw}
                    onChange={(e) => set('confirmPw', e.target.value)}
                  />
                  {errors.confirmPw && <p style={{ fontSize: 11, color: '#D85A30', margin: '4px 0 0' }}>{errors.confirmPw}</p>}
                </div>
              </div>

              {/* Role-specific fields */}
              {role === 'tenant' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={labelStyle}>I am a</label>
                  <select
                    style={inputStyle(false)}
                    value={form.tenantType}
                    onChange={(e) => set('tenantType', e.target.value)}
                  >
                    {TENANT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              )}

              {role === 'tenant' && (
                <div style={{ marginBottom: 20 }}>
                  <label style={labelStyle}>Municipality</label>
                  <select style={inputStyle(false)} value={form.municipality} onChange={(e) => set('municipality', e.target.value)}>
                    {['Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Itbayat', 'Sabtang'].map((m) => (
                      <option key={m}>{m}</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    flex: 1, padding: 11, borderRadius: 8, fontSize: 14,
                    background: '#fff', border: '0.5px solid #d6d3ca',
                    color: '#5F5E5A', cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  style={{
                    flex: 2, padding: 11, borderRadius: 8, fontSize: 14, fontWeight: 600,
                    background: isLoading ? '#9FE1CB' : '#0F6E56',
                    color: '#fff', border: 'none',
                    cursor: isLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {isLoading ? 'Creating Account…' : 'Create Account'}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa8a0', marginTop: 20 }}>
          © 2026 SmartStay
        </p>
      </div>
    </div>
  )
}
