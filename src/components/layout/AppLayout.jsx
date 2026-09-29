import { Outlet, useLocation } from 'react-router-dom'
import { useEffect, useState } from 'react'
import Sidebar from './Sidebar'
import { useAppStore } from '@/store/useAppStore'
import { useAuthStore } from '@/store/useAuthStore'
import { Menu, AlertTriangle, X } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'
import ThemeToggle from '@/components/layout/ThemeToggle'
import Toaster from '@/components/ui/Toaster'
import ConfirmModal from '@/components/ui/ConfirmModal'
import SmartStayLogo from '@/components/ui/SmartStayLogo'
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime'
import SupportModal from '@/components/support/SupportModal'

function getPageMeta(pathname, user) {
  // Tenant routes
  if (pathname === '/tenant' || pathname === '/tenant/') {
    const firstName = user?.name ? user.name.split(' ')[0] : 'User'
    return { title: 'Dashboard Overview', subtitle: `Welcome back, ${firstName}` }
  }
  if (pathname.startsWith('/tenant/search')) return { title: 'Find Boarding Houses', subtitle: 'Explore and filter verified stays across Batanes' }
  if (pathname.startsWith('/tenant/recommendations')) return { title: 'Recommendations', subtitle: 'Curated stays tailored to your preferences' }
  if (pathname.startsWith('/tenant/map')) return { title: 'Interactive Map', subtitle: 'Explore boarding houses geographically' }
  if (pathname.startsWith('/tenant/room')) return { title: 'My Room & Stay', subtitle: 'Assigned room details, amenities, and photos' }
  if (pathname.startsWith('/tenant/reservations')) return { title: 'Reservations', subtitle: 'View and track your booking history' }
  if (pathname.startsWith('/tenant/payments')) return { title: 'My Payments', subtitle: 'Track rent payments, receipts, and deposits' }
  if (pathname.startsWith('/tenant/landlord')) return { title: 'My Landlord', subtitle: 'Host contact information and house details' }
  if (pathname.startsWith('/tenant/messages') || pathname.startsWith('/owner/messages')) return { title: 'Messages', subtitle: 'Chat in real-time with landlords or tenants' }
  if (pathname.startsWith('/tenant/profile') || pathname.startsWith('/owner/profile')) return { title: 'My Profile', subtitle: 'Manage your account details and preferences' }
  if (pathname.startsWith('/tenant/property/')) return { title: 'Property Details', subtitle: 'Boarding house information and rooms' }

  // Owner routes
  if (pathname === '/owner' || pathname === '/owner/') return { title: 'Homeowner Dashboard', subtitle: 'Manage your properties, rooms, and bookings' }
  if (pathname === '/owner/properties') return { title: 'My Properties', subtitle: 'Manage listings, pricing, and occupancy' }
  if (pathname.startsWith('/owner/properties/add')) return { title: 'Add New Property', subtitle: 'List a new boarding house on SmartStay' }
  if (pathname.startsWith('/owner/properties/edit/')) return { title: 'Edit Property', subtitle: 'Update listing details and photos' }
  if (pathname.startsWith('/owner/rooms/')) return { title: 'Manage Rooms', subtitle: 'Configure rooms, pricing, and availability' }
  if (pathname.startsWith('/owner/tenants')) return { title: 'My Tenants', subtitle: 'Current active tenants in your properties' }
  if (pathname.startsWith('/owner/reservations')) return { title: 'Reservations', subtitle: 'Review and approve booking requests' }
  if (pathname.startsWith('/owner/ledger')) return { title: 'Ledger & Payments', subtitle: 'Review tenant payment receipts and cashflow' }

  // Admin routes
  if (pathname === '/admin' || pathname === '/admin/') {
    const region = user?.admin_region ? user.admin_region.replace(' Island', '') : 'Regional'
    return { title: user?.role === 'super_admin' ? 'System Command Center' : `${region} Command Center`, subtitle: 'Platform overview and real-time insights' }
  }
  if (pathname.startsWith('/admin/users')) return { title: 'User Management', subtitle: 'All registered tenants, homeowners, and admins' }
  if (pathname.startsWith('/admin/properties')) return { title: 'All Properties', subtitle: 'Audit, verify, or review submitted boarding houses' }
  if (pathname.startsWith('/admin/staff')) return { title: 'Manage Staff', subtitle: 'Create and assign regional administrators' }
  if (pathname.startsWith('/admin/map')) return { title: 'System Map', subtitle: 'Geographic distribution of all listings' }

  return { title: 'SmartStay', subtitle: 'Batanes Accommodation Management' }
}

export default function AppLayout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const theme = useAppStore((s) => s.theme)
  const user = useAuthStore((s) => s.user)
  const location = useLocation()
  const [supportOpen, setSupportOpen] = useState(false)
  const [bannerDismissed, setBannerDismissed] = useState(false)

  const isUnderReview = user?.accountStatus === 'suspended'

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [theme])

  useGlobalRealtime()

  const meta = getPageMeta(location.pathname, user)

  return (
    <div className="flex min-h-screen bg-transparent">

      {/* Single Sidebar instance */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar: fixed overlay on mobile, sticky side panel on desktop */}
      <div
        className={[
          'md:block md:sticky md:top-0 md:h-screen md:flex-shrink-0 md:w-[220px] md:translate-x-0',
          'fixed top-0 left-0 h-full z-50 w-[260px] transition-transform duration-300',
          'md:static md:z-auto md:transition-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <Sidebar />
      </div>

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto flex flex-col h-screen">
        {/* Global Unified Header (Desktop + Mobile) */}
        <header className="h-14 flex items-center justify-between px-4 sm:px-6 backdrop-blur-md border-b sticky top-0 z-40 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile Brand icon */}
            <div className="md:hidden flex items-center flex-shrink-0">
              <div 
                className="w-8 h-8 rounded-lg shadow-xs flex items-center justify-center p-1 shrink-0 border border-stone-200/60 dark:border-white/20"
                style={{ backgroundColor: '#ffffff' }}
              >
                <img src="/logo-icon.png" alt="SmartStay" className="w-full h-full object-contain" />
              </div>
            </div>
            
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg text-stone-900 dark:text-stone-100 truncate leading-tight">
                {meta.title}
              </h1>
              {meta.subtitle && (
                <p className="text-[11px] sm:text-xs text-stone-400 dark:text-stone-500 truncate mt-0.5 hidden sm:block">
                  {meta.subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Right Global Actions (Theme + Notifications + Mobile Menu) */}
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <ThemeToggle />
            <NotificationBell />
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 -mr-1 text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-lg transition-colors"
              aria-label="Toggle Menu"
            >
              <Menu size={22} />
            </button>
          </div>
        </header>

        {/* Under Review Persistent Banner */}
        {isUnderReview && !bannerDismissed && (
          <div
            role="alert"
            className="shrink-0 flex items-start gap-3 px-4 sm:px-6 py-3 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800/60 animate-fadeIn"
          >
            <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-[12px] font-semibold text-amber-900 dark:text-amber-200">
                ⏸️ Your account is currently under review by administration.
              </p>
              <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                You can browse and view your active stays, but <strong>reservations</strong> and <strong>messaging</strong> are paused until the review is resolved.
                {user?.statusReason && <span className="block mt-0.5">Reason: <em>{user.statusReason}</em></span>}
              </p>
              <button
                onClick={() => setSupportOpen(true)}
                className="mt-1.5 text-[11px] font-bold text-amber-800 dark:text-amber-300 underline hover:no-underline transition-all"
              >
                Submit a clarification or document →
              </button>
            </div>
            <button
              onClick={() => setBannerDismissed(true)}
              className="text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 flex-shrink-0 p-1 rounded"
              aria-label="Dismiss banner"
            >
              <X size={14} />
            </button>
          </div>
        )}

        <Outlet />
      </main>

      {/* Support Modal (triggered from Under Review banner — opens in appeal mode) */}
      {supportOpen && (
        <SupportModal
          isOpen={supportOpen}
          onClose={() => setSupportOpen(false)}
          appealMode={isUnderReview}
          statusReason={user?.statusReason || null}
        />
      )}

      {/* Global Overlays */}
      <Toaster />
      <ConfirmModal />
    </div>
  )
}
 