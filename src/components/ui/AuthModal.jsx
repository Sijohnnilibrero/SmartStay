import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

// Detect email provider from address and return a direct inbox URL
function getEmailProviderLink(email = '') {
  const domain = email.split('@')[1]?.toLowerCase() || ''
  if (domain.includes('gmail'))        return { url: 'https://mail.google.com', label: 'Open Gmail' }
  if (domain.includes('yahoo'))        return { url: 'https://mail.yahoo.com',  label: 'Open Yahoo Mail' }
  if (domain.includes('outlook') || domain.includes('hotmail') || domain.includes('live'))
                                        return { url: 'https://outlook.live.com', label: 'Open Outlook' }
  if (domain.includes('icloud'))       return { url: 'https://www.icloud.com/mail', label: 'Open iCloud Mail' }
  return { url: `https://${domain}`, label: 'Open your inbox' }
}

const CONFIGS = {
  // Account just created — prompt email confirmation
  account_created: {
    icon: '📧',
    title: 'Account Created!',
    color: '#D97706',
    bg: '#FFF8E7',
    border: '#D97706',
    titleColor: '#78350F',
    bodyColor: '#92400E',
    showEmailLink: true,
    showResend: false,
    buttonLabel: 'Got it',
  },
  // Account created AND confirmation is OFF — user can log in immediately
  account_created_instant: {
    icon: '✅',
    title: 'Account Created!',
    color: '#0F6E56',
    bg: '#E1F5EE',
    border: '#1D9E75',
    titleColor: '#064E3B',
    bodyColor: '#065F46',
    showEmailLink: false,
    showResend: false,
    buttonLabel: 'Go to Login',
  },
  // Tried to login but email not confirmed yet
  email_unconfirmed: {
    icon: '📬',
    title: 'Email Not Confirmed',
    color: '#D97706',
    bg: '#FFF8E7',
    border: '#D97706',
    titleColor: '#78350F',
    bodyColor: '#92400E',
    showEmailLink: true,
    showResend: true,
    buttonLabel: 'OK',
  },
  // Account banned
  banned: {
    icon: '🚫',
    title: 'Account Banned',
    color: '#DC2626',
    bg: '#FEF2F2',
    border: '#DC2626',
    titleColor: '#7F1D1D',
    bodyColor: '#991B1B',
    showEmailLink: false,
    showResend: false,
    buttonLabel: 'Close',
  },
  // Account suspended
  suspended: {
    icon: '⏸️',
    title: 'Account Suspended',
    color: '#D97706',
    bg: '#FFFBEB',
    border: '#F59E0B',
    titleColor: '#78350F',
    bodyColor: '#92400E',
    showEmailLink: false,
    showResend: false,
    buttonLabel: 'Close',
  },
}

export default function AuthModal({
  type,            // 'account_created' | 'email_unconfirmed' | 'banned' | 'suspended'
  isOpen,
  onClose,
  email = '',
  message = '',    // optional override body text
  onResend,        // function to call when resend is clicked
  resendStatus = '', // '' | 'sending' | 'sent' | 'error'
}) {
  if (!isOpen || !type) return null

  const cfg = CONFIGS[type]
  if (!cfg) return null

  const provider = getEmailProviderLink(email)

  return createPortal(
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, background: 'rgba(0,0,0,0.45)',
        backdropFilter: 'blur(4px)',
        animation: 'fadeIn 0.15s ease',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          width: '100%', maxWidth: 400,
          overflow: 'hidden', fontFamily: "'Plus Jakarta Sans', sans-serif",
          animation: 'zoomIn 0.15s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Colored top stripe */}
        <div style={{ height: 6, background: cfg.color }} />

        {/* Close button */}
        <div style={{ position: 'relative', padding: '20px 20px 0' }}>
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: '#f5f4f0', border: 'none', borderRadius: '50%',
              width: 28, height: 28, display: 'flex', alignItems: 'center',
              justifyContent: 'center', cursor: 'pointer', color: '#5F5E5A',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '8px 28px 28px', textAlign: 'center' }}>
          {/* Icon */}
          <div style={{ fontSize: 48, lineHeight: 1, marginBottom: 12 }}>{cfg.icon}</div>

          {/* Title */}
          <h2 style={{
            fontSize: 18, fontWeight: 800, color: cfg.titleColor,
            margin: '0 0 8px',
          }}>
            {cfg.title}
          </h2>

          {/* Message */}
          <p style={{ fontSize: 13, color: cfg.bodyColor, margin: '0 0 20px', lineHeight: 1.6 }}>
            {message || (
              type === 'account_created'
                ? <>We sent a confirmation link to <strong>{email}</strong>. Click the link in your inbox to activate your account before logging in.</>
                : type === 'account_created_instant'
                ? <>Your account has been created successfully! You can now sign in with your email and password.</>
                : type === 'email_unconfirmed'
                ? <>Your account for <strong>{email}</strong> hasn't been verified yet. Check your inbox and click the confirmation link to continue.</>
                : type === 'banned'
                ? 'Your account has been banned from the platform. Please contact the administration team if you believe this is a mistake.'
                : 'Your account has been temporarily suspended. Please contact the administration team for assistance.'
            )}
          </p>

          {/* Open email provider button */}
          {cfg.showEmailLink && email && (
            <a
              href={provider.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 8, width: '100%', padding: '11px 16px',
                background: cfg.color, color: '#fff',
                borderRadius: 10, fontSize: 13, fontWeight: 700,
                textDecoration: 'none', marginBottom: 10,
                boxSizing: 'border-box',
                transition: 'opacity 0.15s',
              }}
              onMouseOver={(e) => e.currentTarget.style.opacity = '0.88'}
              onMouseOut={(e) => e.currentTarget.style.opacity = '1'}
            >
              ✉️ {provider.label}
            </a>
          )}

          {/* Resend button (email_unconfirmed only) */}
          {cfg.showResend && (
            <div style={{ marginBottom: 10 }}>
              {resendStatus === 'sent' ? (
                <p style={{ fontSize: 12, color: '#065F46', fontWeight: 600, margin: 0 }}>
                  ✅ Confirmation email resent! Check your inbox.
                </p>
              ) : resendStatus === 'error' ? (
                <p style={{ fontSize: 12, color: '#991B1B', margin: 0 }}>
                  ❌ Failed to resend. Please try again shortly.
                </p>
              ) : (
                <button
                  onClick={onResend}
                  disabled={resendStatus === 'sending'}
                  style={{
                    width: '100%', padding: '10px 16px', boxSizing: 'border-box',
                    background: '#fff', border: `1px solid ${cfg.border}`,
                    borderRadius: 10, fontSize: 13, fontWeight: 600,
                    color: cfg.titleColor, cursor: resendStatus === 'sending' ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  {resendStatus === 'sending' ? 'Sending…' : 'Resend Confirmation Email'}
                </button>
              )}
            </div>
          )}

          {/* Dismiss button */}
          <button
            onClick={onClose}
            style={{
              width: '100%', padding: '10px 16px', boxSizing: 'border-box',
              background: '#f5f4f0', border: 'none', borderRadius: 10,
              fontSize: 13, fontWeight: 600, color: '#5F5E5A',
              cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {cfg.buttonLabel}
          </button>
        </div>
      </div>

      {/* Keyframe animations */}
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes zoomIn { from { opacity: 0; transform: scale(0.95) } to { opacity: 1; transform: scale(1) } }
      `}</style>
    </div>,
    document.body
  )
}
