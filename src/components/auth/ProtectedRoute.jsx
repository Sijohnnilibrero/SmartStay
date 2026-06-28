import { Navigate, Outlet } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Wraps protected routes.
 * - If not logged in → redirect to /login
 * - If allowedRoles provided → check role, redirect to /unauthorized if mismatch
 */
export default function ProtectedRoute({ allowedRoles }) {
  const user = useAuthStore((s) => s.user)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    if (user.role === 'admin' || user.role === 'super_admin') return <Navigate to="/admin" replace />
    if (user.role === 'owner') return <Navigate to="/owner" replace />
    return <Navigate to="/tenant" replace />
  }

  return <Outlet />
}
