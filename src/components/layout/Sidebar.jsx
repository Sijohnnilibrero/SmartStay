import { NavLink, useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, CalendarCheck, Sparkles,
  Users, Home, LogOut, BarChart3, Map, User, BedDouble, MessageSquare, DollarSign, AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

const getAdminNav = (user) => {
  const isSuper = user?.role === 'super_admin'
  const manageRoutes = [
    { to: '/admin/users', label: 'Users' },
    { to: '/admin/properties', label: 'Properties' },
    { to: '/admin/reservations', label: 'Reservations' },
  ]
  
  if (isSuper) {
    manageRoutes.push({ to: '/admin/ledger', label: 'Ledger', icon: DollarSign })
    manageRoutes.push({ to: '/admin/staff', label: 'Manage Staff', icon: Users })
  }

  return [
    { label: 'Dashboard', icon: LayoutDashboard, routes: [
      { to: '/admin', label: 'Overview' },
      { to: '/admin/analytics', label: 'Analytics' }
    ] },
    { label: 'Manage', icon: Users, routes: manageRoutes },
    { label: 'Discover', icon: Sparkles, routes: [
      { to: '/admin/map', label: 'System Map', icon: Map },
      { to: '/admin/complaints', label: 'Complaints', icon: AlertTriangle },
    ] }
  ]
}

const NAV_OWNER = [
  { label: 'Dashboard', icon: LayoutDashboard, routes: [{ to: '/owner', label: 'Overview' }] },
  {
    label: 'Manage', icon: Home, routes: [
      { to: '/owner/properties', label: 'My Properties' },
      { to: '/owner/reservations', label: 'Reservations' },
      { to: '/owner/ledger', label: 'Ledger', icon: DollarSign },
    ]
  },
  {
    label: 'People', icon: Users, routes: [
      { to: '/owner/tenants', label: 'My Tenants' },
    ]
  },
  {
    label: 'Account', icon: User, routes: [
      { to: '/owner/messages', label: 'Messages', icon: MessageSquare, badgeKey: 'messages' },
      { to: '/owner/profile', label: 'My Profile' },
    ]
  },
]

const NAV_TENANT = [
  { label: 'Dashboard', icon: LayoutDashboard, routes: [{ to: '/tenant', label: 'Overview' }] },
  {
    label: 'Browse', icon: Home, routes: [
      { to: '/tenant/search', label: 'Search' },
    ]
  },
  {
    label: 'My Activity', icon: CalendarCheck, routes: [
      { to: '/tenant/room', label: 'My Room', icon: BedDouble },
      { to: '/tenant/reservations', label: 'Reservations' },
      { to: '/tenant/payments', label: 'My Payments', icon: DollarSign },
      { to: '/tenant/landlord', label: 'My Landlord', icon: User },
    ]
  },
  {
    label: 'Discover', icon: Sparkles, routes: [
      { to: '/tenant/recommendations', label: 'Recommendations' },
      { to: '/tenant/map', label: 'Map', icon: Map },
    ]
  },
  {
    label: 'Account', icon: User, routes: [
      { to: '/tenant/messages', label: 'Messages', icon: MessageSquare, badgeKey: 'messages' },
      { to: '/tenant/profile', label: 'My Profile' },
    ]
  },
]

const getNavForRole = (user) => {
  if (user?.role === 'super_admin' || user?.role === 'admin') return getAdminNav(user)
  if (user?.role === 'owner') return NAV_OWNER
  return NAV_TENANT
}

const ROLE_LABEL = { super_admin: 'Super Admin', admin: 'Administrator', owner: 'Homeowner', tenant: 'Visitor / Tenant' }
const ROLE_COLORS = {
  super_admin: { bg: '#EEEDFE', text: '#534AB7', accent: '#534AB7' },
  admin: { bg: '#EEEDFE', text: '#534AB7', accent: '#534AB7' },
  owner: { bg: '#E1F5EE', text: '#0F6E56', accent: '#0F6E56' },
  tenant: { bg: '#FAEEDA', text: '#BA7517', accent: '#BA7517' },
}

// Sidebar gradient backgrounds per role
const HEADER_GRADIENTS = {
  super_admin: 'linear-gradient(135deg, #534AB7 0%, #7C3AED 100%)',
  admin: 'linear-gradient(135deg, #534AB7 0%, #7C3AED 100%)',
  owner: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)',
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
  const user = useAuthStore((s) => s.user)
  const logout = useAuthStore((s) => s.logout)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)

  const userRole = user?.role || 'tenant'
  const navItems = getNavForRole(user)
  const roleColors = ROLE_COLORS[userRole] || ROLE_COLORS.tenant
  const roleLabel = ROLE_LABEL[userRole] || ROLE_LABEL.tenant
  const headerBg = HEADER_GRADIENTS[userRole] || HEADER_GRADIENTS.tenant

  // Unread message count for badge
  const [unreadMessages, setUnreadMessages] = useState(0)
  useEffect(() => {
    if (user?.role !== 'owner' && user?.role !== 'tenant') return
    const load = async () => {
      const data = await useAuthStore.getState().fetchNotifications()
      setUnreadMessages(data.filter((n) => !n.is_read).length)
    }
    load()
    
    // Listen for realtime message changes (new messages or marked as read)
    const channel = supabase.channel('sidebar-messages-changes')
    channel.on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user?.id}` },
      () => {
        load() // Silently refresh unread count
      }
    ).subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.role, user?.id])

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
    <aside className="flex flex-col w-full h-full bg-white border-r border-stone-200 overflow-hidden">
      {/* Brand Header */}
      <div className="shrink-0 px-5 py-5 relative overflow-hidden" style={{ background: headerBg }}>
        {/* Decorative circle */}
        <div className="absolute -top-4 -right-4 w-20 h-20 rounded-full bg-white/10" />
        <div className="absolute -bottom-6 -left-6 w-24 h-24 rounded-full bg-white/10" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center text-sm">🏠</div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-xl text-white leading-tight">SmartStay</p>
              <span 
                className="px-1.5 py-0.5 bg-white/20 text-white text-[9px] font-bold tracking-wider rounded border border-white/30 backdrop-blur-sm" 
              >
                BETA
              </span>
            </div>
          </div>
          <p className="text-[10px] uppercase tracking-widest text-white/80 font-semibold mt-1">Batanes Platform</p>
          <p className="text-[10px] text-white/70 leading-snug mt-1 italic">
            System is in early development. Expect bugs.
          </p>
        </div>
      </div>

      {/* Role Pill */}
      <div className="shrink-0 px-4 py-2.5 border-b border-stone-100">
        <span
          className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold"
          style={{ background: roleColors.bg, color: roleColors.text }}
        >
          {roleLabel}
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navItems.map(function (group) {
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
                    style={active ? { background: headerBg } : {}}
                  >
                    {route.icon
                      ? <route.icon size={15} className="flex-shrink-0" />
                      : <group.icon size={15} className="flex-shrink-0" />
                    }
                    <span className="truncate flex-1">{route.label}</span>
                    {route.badgeKey === 'messages' && unreadMessages > 0 && (
                      <span className="min-w-[16px] h-4 px-1 bg-[--coral] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </NavLink>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* User Profile & Logout */}
      <div className="shrink-0 p-3 border-t border-stone-100 space-y-1">
        <div 
          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-colors ${user?.role === 'tenant' || user?.role === 'owner' ? 'cursor-pointer hover:bg-stone-100' : 'bg-stone-50'}`}
          onClick={() => {
            if (user?.role === 'tenant') navigate('/tenant/profile')
            else if (user?.role === 'owner') navigate('/owner/profile')
          }}
        >
          {user?.avatar ? (
            <img src={user.avatar} alt="Profile" className="w-8 h-8 rounded-xl object-cover shadow-sm flex-shrink-0" />
          ) : (
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-[12px] font-bold flex-shrink-0 shadow-sm"
              style={{ background: roleColors.bg, color: roleColors.text }}
            >
              {user?.initials || '??'}
            </div>
          )}
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
