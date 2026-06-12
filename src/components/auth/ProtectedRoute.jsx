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
    return <Navigate to="/unauthorized" replace />
  }

  return <Outlet />
}
