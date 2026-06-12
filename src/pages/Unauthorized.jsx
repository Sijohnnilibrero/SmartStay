import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

export default function Unauthorized() {
  const navigate = useNavigate()
  const user     = useAuthStore((s) => s.user)

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#f5f4f0', fontFamily: "'Plus Jakarta Sans', sans-serif",
      textAlign: 'center', padding: 24,
    }}>
      <div style={{ fontSize: 56, marginBottom: 16 }}>🚫</div>
      <h1 className="text-[28px] text-[#1a1a18] m-[0_0_8px] font-bold">
        Access Restricted
      </h1>
      <p style={{ fontSize: 14, color: '#888780', marginBottom: 28, maxWidth: 360 }}>
        Your account ({user?.role}) does not have permission to view this page.
      </p>
      <div style={{ display: 'flex', gap: 10 }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 500,
            background: '#fff', border: '0.5px solid #d6d3ca', color: '#5F5E5A',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          ← Go Back
        </button>
        <button
          onClick={() => navigate('/')}
          style={{
            padding: '10px 20px', borderRadius: 8, fontSize: 13, fontWeight: 600,
            background: '#0F6E56', color: '#fff', border: 'none',
            cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          Go to Dashboard
        </button>
      </div>
    </div>
  )
}
