import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

const ROLE_META = {
  admin: { color: '#534AB7', bg: '#EEEDFE', label: 'Administrator', initials: 'AD' },
  owner: { color: '#0F6E56', bg: '#E1F5EE', label: 'Homeowner', initials: 'OW' },
  tenant: { color: '#BA7517', bg: '#FAEEDA', label: 'Tenant / Tourist', initials: 'TN' },
}

export default function Login() {
  const navigate = useNavigate()
  const { login, isLoading, authError, clearError } = useAuthStore()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const result = await login(email, password)
    if (result.success) {
      var role = result.user?.role
      if (role === 'admin') navigate('/admin')
      else if (role === 'owner') navigate('/owner')
      else navigate('/tenant')
    }
  }
  const quickFill = (account) => {
    clearError()
    setEmail(account.email)
    setPassword(account.password)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f5f4f0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      <div style={{ width: '100%', maxWidth: 420 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 14,
            background: '#0F6E56', display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 12px', fontSize: 24,
          }}>🏠</div>
          <h1 className="text-[26px] text-[#1a1a18] m-0 font-bold">
            SmartStay
          </h1>
          <p style={{ fontSize: 12, color: '#888780', marginTop: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Batanes Boarding House Platform
          </p>
        </div>

        {/* Card */}
        <div style={{
          background: '#fff', borderRadius: 16,
          border: '0.5px solid #e5e2da', padding: 28,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, color: '#1a1a18', marginBottom: 20, marginTop: 0 }}>
            Sign in to your account
          </h2>

          {authError && (
            <div style={{
              background: '#FAECE7', border: '0.5px solid #D85A30',
              borderRadius: 8, padding: '10px 14px', marginBottom: 16,
              fontSize: 13, color: '#993C1D',
            }}>
              {authError}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            {/* Email */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { clearError(); setEmail(e.target.value) }}
                placeholder="you@smartstay.ph"
                required
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: 8,
                  border: '0.5px solid #d6d3ca', fontSize: 13, color: '#1a1a18',
                  background: '#fff', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 500, color: '#5F5E5A', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { clearError(); setPassword(e.target.value) }}
                  placeholder="••••••••"
                  required
                  style={{
                    width: '100%', padding: '10px 40px 10px 12px', borderRadius: 8,
                    border: '0.5px solid #d6d3ca', fontSize: 13, color: '#1a1a18',
                    background: '#fff', outline: 'none', boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 14, color: '#888780', padding: 4,
                  }}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              style={{
                width: '100%', padding: '11px', borderRadius: 8,
                background: isLoading ? '#9FE1CB' : '#0F6E56',
                color: '#fff', fontSize: 14, fontWeight: 600,
                border: 'none', cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', transition: 'background 0.15s',
              }}
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontSize: 13, color: '#5F5E5A' }}>
          No account? <a href="/register" style={{ color: '#0F6E56', fontWeight: 600, textDecoration: 'none' }}>Register here</a>
        </p>

        <p style={{ textAlign: 'center', fontSize: 11, color: '#aaa8a0', marginTop: 24 }}>
          © 2026 SmartStay
        </p>
      </div>
    </div>
  )
}
