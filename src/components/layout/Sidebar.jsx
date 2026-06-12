import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarCheck, Sparkles,
  Users, Home, LogOut, BarChart3, Map, User, BedDouble,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'

const NAV_ADMIN = [
  { label: 'Dashboard', icon: LayoutDashboard, routes: [{ to: '/admin', label: 'Overview' }] },
  { label: 'Manage', icon: Users, routes: [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/properties', label: 'Properties' },
    { to: '/admin/reservations', label: 'Reservations' },
  ]},
  { label: 'Analytics', icon: BarChart3, routes: [
    { to: '/admin/analytics', label: 'Reports' },
  ]},
]

const NAV_OWNER = [
  { label: 'Dashboard', icon: LayoutDashboard, routes: [{ to: '/owner', label: 'Overview' }] },
  { label: 'Manage', icon: Home, routes: [
    { to: '/owner/properties', label: 'My Properties' },
    { to: '/owner/reservations', label: 'Reservations' },
  ]},
  { label: 'People', icon: Users, routes: [
    { to: '/owner/tenants', label: 'My Tenants' },
  ]},
]

const NAV_TENANT = [
  { label: 'Dashboard', icon: LayoutDashboard, routes: [{ to: '/tenant', label: 'Overview' }] },
  { label: 'Browse', icon: Home, routes: [
    { to: '/tenant/search', label: 'Search' },
  ]},
  { label: 'My Activity', icon: CalendarCheck, routes: [
    { to: '/tenant/room', label: 'My Room', icon: BedDouble },
    { to: '/tenant/reservations', label: 'Reservations' },
    { to: '/tenant/reviews', label: 'Reviews' },
    { to: '/tenant/landlord', label: 'My Landlord', icon: User },
  ]},
  { label: 'Discover', icon: Sparkles, routes: [
    { to: '/tenant/recommend', label: 'Recommendations' },
    { to: '/tenant/map', label: 'Map', icon: Map },
  ]},
]

const NAV_BY_ROLE = { admin: NAV_ADMIN, owner: NAV_OWNER, tenant: NAV_TENANT }
const ROLE_LABEL  = { admin: 'Administrator', owner: 'Homeowner', tenant: 'Tenant' }
const ROLE_COLORS = {
  admin:  { bg: '#EEEDFE', text: '#534AB7', accent: '#534AB7' },
  owner:  { bg: '#E1F5EE', text: '#0F6E56', accent: '#0F6E56' },
  tenant: { bg: '#FAEEDA', text: '#BA7517', accent: '#BA7517' },
}

// Sidebar gradient backgrounds per role
const HEADER_GRADIENTS = {
  admin:  'linear-gradient(135deg, #534AB7 0%, #7C3AED 100%)',
  owner:  'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)',
  tenant: 'linear-gradient(135deg, #BA7517 0%, #D97706 100%)',
}

function isActiveRoute(to, pathname) {
  if (to === '/admin' || to === '/owner' || to === '/tenant') {
    return pathname === to
  }
  return pathname.startsWith(to)
}

export default function Sidebar() {
  const navigate = useNavigate()
  const location = { pathname: typeof window !== 'undefined' ? window.location.pathname : '/' }
  const user     = useAuthStore((s) => s.user)
  const logout   = useAuthStore((s) => s.logout)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  const nav     = NAV_BY_ROLE[user?.role] || NAV_TENANT
  const colors  = ROLE_COLORS[user?.role] || ROLE_COLORS.admin
  const gradient = HEADER_GRADIENTS[user?.role] || HEADER_GRADIENTS.admin

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const handleNavClick = () => {
    if (window.innerWidth < 768 && sidebarOpen) {
      toggleSidebar()
    }
  }

  return (
    <aside className="flex flex-col w-full md:w-[220px] flex-shrink-0 bg-white md:border-r border-stone-200 h-screen sticky top-0">
      {/* Brand Header */}
      <div className="px-5 py-5 relative overflow-hidden" style={{ background: gradient }}>
        {/* Decorative circle */}
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm">🏠</div>
            <p className="font-bold text-xl text-white leading-tight">SmartStay</p>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/60">Batanes Platform</p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="px-4 py-2.5 border-b border-stone-100">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: colors.bg, color: colors.text }}
        >
          {ROLE_LABEL[user?.role] || 'Guest'}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {nav.map(function (group) {
          return (
            <div key={group.label} className="mb-3">
              <p className="text-[10px] uppercase tracking-widest text-stone-400 font-medium px-2 py-1.5 flex items-center gap-1.5">
                <group.icon size={11} className="opacity-50" />
                {group.label}
              </p>
              {group.routes.map(function (route) {
                const active = isActiveRoute(route.to, location.pathname)
                return (
                  <NavLink
                    key={route.to + route.label}
                    to={route.to}
                    onClick={handleNavClick}
                    end={route.to === '/admin' || route.to === '/owner' || route.to === '/tenant'}
                    className={cn(
                      'flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm mb-0.5 transition-all duration-150',
                      active
                        ? 'text-white font-medium shadow-sm'
                        : 'text-stone-500 hover:bg-stone-50 hover:text-stone-800'
                    )}
                    style={active ? { background: gradient } : {}}
                  >
                    {route.icon
                      ? <route.icon size={15} className="flex-shrink-0" />
                      : <group.icon size={15} className="flex-shrink-0" />
                    }
                    <span className="truncate">{route.label}</span>
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="p-3 border-t border-stone-100 space-y-1">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-stone-50">
          <div
            className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0 shadow-sm"
            style={{ background: colors.bg, color: colors.text }}
          >
            {user?.initials || '??'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[12px] font-semibold text-stone-800 truncate">{user?.name || 'Guest'}</p>
            <p className="text-[10px] text-stone-400 truncate">{user?.email || ''}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[12px] text-stone-500 hover:bg-red-50 hover:text-red-600 transition-all duration-150"
        >
          <LogOut size={13} />
          Sign out
        </button>
      </div>
    </aside>
  )
}
