import { Routes, Route, Navigate } from 'react-router-dom'
import { useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import AppLayout       from '@/components/layout/AppLayout'
import ProtectedRoute  from '@/components/auth/ProtectedRoute'
import TenantOnboarding from '@/components/TenantOnboarding'
import Login           from '@/pages/Login'
import Register        from '@/pages/Register'
import Unauthorized    from '@/pages/Unauthorized'
import TenantDashboard from '@/pages/tenant/TenantDashboard'
import TenantSearch    from '@/pages/tenant/TenantSearch'
import TenantPropertyDetails from '@/pages/tenant/TenantPropertyDetails'
import TenantRecommendations from '@/pages/tenant/Recommendations'
import TenantMap       from '@/pages/tenant/TenantMap'
import MyLandlord      from '@/pages/tenant/MyLandlord'
import MyRoom          from '@/pages/tenant/MyRoom'
import TenantBrowseRooms from '@/pages/tenant/TenantBrowseRooms'
import HomeownerDashboard from '@/pages/homeowner/HomeownerDashboard'
import HomeownerTenants from '@/pages/homeowner/HomeownerTenants'
import HomeownerRooms from '@/pages/homeowner/HomeownerRooms'
import HomeownerProfile from '@/pages/homeowner/HomeownerProfile'
import AdminDashboard from '@/pages/admin/AdminDashboard'
import Properties      from '@/pages/Properties'
import AddProperty     from '@/pages/AddProperty'
import Reservations    from '@/pages/Reservations'
import Reviews         from '@/pages/Reviews'
import Tenants         from '@/pages/Tenants'
import NotFound        from '@/pages/NotFound'

export default function App() {
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const user = useAuthStore((s) => s.user)

  useEffect(() => { restoreSession() }, [])

  function getRedirectPath() {
    if (!user) return '/login'
    if (user.role === 'admin') return '/admin'
    if (user.role === 'owner') return '/owner'
    return '/tenant'
  }

  return (
    <Routes>
      <Route path="/login"        element={<Login />} />
      <Route path="/register"     element={<Register />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<><AppLayout /><TenantOnboarding /></>}>
          {/* Tenant routes */}
          <Route path="/tenant">
            <Route index element={<TenantDashboard />} />
             <Route path="search" element={<TenantSearch />} />
             <Route path="rooms" element={<TenantBrowseRooms />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="reviews" element={<Reviews />} />
            <Route path="recommend" element={<TenantRecommendations />} />
            <Route path="map" element={<TenantMap />} />
            <Route path="favorites" element={<Reservations />} />
            <Route path="property/:id" element={<TenantPropertyDetails />} />
             <Route path="landlord" element={<MyLandlord />} />
             <Route path="room" element={<MyRoom />} />
          </Route>

          {/* Owner/Homeowner routes - owners can add properties */}
          <Route path="/owner" element={<ProtectedRoute allowedRoles={['owner']} />}>
            <Route index element={<HomeownerDashboard />} />
            <Route path="properties" element={<Properties />} />
            <Route path="properties/add" element={<AddProperty />} />
            <Route path="properties/edit/:id" element={<AddProperty />} />
            <Route path="rooms/:propertyId" element={<HomeownerRooms />} />
            <Route path="tenants" element={<HomeownerTenants />} />
            <Route path="reservations" element={<Reservations />} />
            <Route path="profile" element={<HomeownerProfile />} />
          </Route>

          {/* Admin routes - view only */}
          <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']} />}>
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<Tenants />} />
            <Route path="properties" element={<Properties />} />
            <Route path="reservations" element={<Reservations />} />
          </Route>
        </Route>
      </Route>

      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
