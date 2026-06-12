import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui'
import { Home } from 'lucide-react'
import { useAuthStore } from '@/store/useAuthStore'

export default function NotFound() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const handleBackToDashboard = () => {
    if (!user) {
      navigate('/login')
    } else if (user.role === 'admin') {
      navigate('/admin')
    } else if (user.role === 'owner') {
      navigate('/owner')
    } else {
      navigate('/tenant')
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-stone-50 text-center px-6">
      <p className="text-7xl mb-4">🏠</p>
      <h1 className="font-bold text-4xl text-stone-800 mb-2">Page Not Found</h1>
      <p className="text-stone-400 mb-6">The page you're looking for doesn't exist or has been moved.</p>
      <Button variant="primary" onClick={handleBackToDashboard}>
        <Home size={14} /> Back to Dashboard
      </Button>
    </div>
  )
}
