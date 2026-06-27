import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Topbar from '@/components/layout/Topbar'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import TenantProfileModal from '@/components/ui/TenantProfileModal'
import HomeownerProfileModal from '@/components/ui/HomeownerProfileModal'
import {
  Search, Users, GraduationCap, Briefcase, Building2, Globe,
  MapPin, Calendar, Mail, Eye
} from 'lucide-react'

const TYPE_COLORS = {
  student:             { bg: '#EDE9FE', text: '#7C3AED', label: 'Student' },
  professional:        { bg: '#E1F5EE', text: '#0F6E56', label: 'Professional' },
  government_employee: { bg: '#FEF3C7', text: '#D97706', label: 'Gov. Employee' },
  visitor:             { bg: '#F5F4F0', text: '#78716C', label: 'Visitor' },
}

const TYPE_ICONS = {
  student:             <GraduationCap size={14} />,
  professional:        <Briefcase size={14} />,
  government_employee: <Building2 size={14} />,
  visitor:             <Globe size={14} />,
}

function TenantCard({ t, isAdmin, onAction, onViewProfile }) {
  const color = TYPE_COLORS[t.tenant_type] || { bg: '#F5F4F0', text: '#78716C', label: t.tenant_type || 'Tenant' }
  const icon  = TYPE_ICONS[t.tenant_type] || <Users size={14} />
  const initials = (t.full_name || '??').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3 relative">
      {/* Top: avatar + name */}
      <div className="flex items-center gap-3">
        {t.avatar_url ? (
          <img src={t.avatar_url} alt={t.full_name} className="w-12 h-12 rounded-2xl object-cover shadow-sm flex-shrink-0 border border-stone-100" />
        ) : (
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center text-[15px] font-bold flex-shrink-0 shadow-sm"
            style={{ background: color.bg, color: color.text }}
          >
            {initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-stone-800 text-[14px] truncate pr-8">{t.full_name}</p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: color.bg, color: color.text }}
            >
              {isAdmin ? (t.role === 'owner' ? 'Homeowner' : 'Tenant') : color.label}
            </span>
            {isAdmin && t.status && t.status !== 'active' && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${t.status === 'banned' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                {t.status.toUpperCase()}
              </span>
            )}
          </div>
        </div>
        {isAdmin && (
          <button 
            onClick={() => onViewProfile(t)}
            className="absolute top-4 right-4 p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
            title="View Profile"
          >
            <Eye size={16} />
          </button>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-stone-100" />

      {/* Details */}
      <div className="space-y-1.5">
        {t.municipality && (
          <div className="flex items-center gap-2 text-[12px] text-stone-500">
            <MapPin size={12} className="text-stone-400 flex-shrink-0" />
            {t.municipality}
          </div>
        )}
        {t.email && (
          <div className="flex items-center gap-2 text-[12px] text-stone-500 truncate">
            <Mail size={12} className="text-stone-400 flex-shrink-0" />
            <span className="truncate">{t.email}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-[11px] text-stone-400">
          <Calendar size={11} className="flex-shrink-0" />
          Joined {t.created_at ? new Date(t.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
        </div>
      </div>

      {/* ID chip */}
      <div className="text-[10px] text-stone-300 font-mono bg-stone-50 rounded-lg px-2 py-1 truncate">
        ID: {t.id ? t.id.substring(0, 12) : '—'}
      </div>

      {/* Admin Actions */}
      {isAdmin && (
        <div className="mt-1 pt-3 border-t border-stone-100 flex gap-2">
          {t.status !== 'active' ? (
            <Button size="sm" variant="ghost" className="flex-1 text-[11px] text-[#0F6E56] hover:bg-[#E1F5EE]" onClick={() => onAction(t, 'active')}>
              Activate
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="flex-1 text-[11px] text-amber-600 hover:bg-amber-50" onClick={() => onAction(t, 'suspended')}>
              Suspend
            </Button>
          )}
          {t.status !== 'banned' && (
            <Button size="sm" variant="ghost" className="flex-1 text-[11px] text-red-600 hover:bg-red-50" onClick={() => onAction(t, 'banned')}>
              Ban
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

export default function Tenants() {
  var user = useAuthStore(function (s) { return s.user })
  var isAdmin = useAuthStore(function (s) { return s.isAdmin })
  var isOwner = useAuthStore(function (s) { return s.isOwner })

  var fetchTenants = useAuthStore(function (s) { return s.fetchTenants })
  var fetchAllUsers = useAuthStore(function (s) { return s.fetchAllUsers })
  var updateUserStatus = useAuthStore(function (s) { return s.updateUserStatus })
  var fetchReservations = useAuthStore(function (s) { return s.fetchReservations })
  var fetchProperties = useAuthStore(function (s) { return s.fetchProperties })

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionUser, setActionUser] = useState(null)
  const [selectedProfile, setSelectedProfile] = useState(null)
  const wasHiddenRef = useRef(false)

  var loadTenants = useCallback(function () {
    setLoading(true)
    Promise.all([
      isAdmin ? fetchAllUsers() : fetchTenants(),
      fetchReservations(),
      fetchProperties(),
    ]).then(function (results) {
      var allTenants = results[0] || []
      if (!isAdmin() && user) {
        var myProps = (results[2] || []).filter(function (p) { return p.owner_id === user.id })
        var myPropIds = myProps.map(function (p) { return p.id })
        var myResIds = (results[1] || []).filter(function (r) { return myPropIds.indexOf(r.property_id) !== -1 }).map(function (r) { return r.tenant_id })
        setTenants(allTenants.filter(function (t) { return myResIds.indexOf(t.id) !== -1 }))
      } else {
        if (user?.role === 'admin' && user?.admin_region) {
          if (user.admin_region === 'Batan Island') {
            allTenants = allTenants.filter(t => ['Basco', 'Mahatao', 'Ivana', 'Uyugan'].includes(t.municipality))
          } else {
            allTenants = allTenants.filter(t => t.municipality === user.admin_region)
          }
        }
        setTenants(allTenants)
      }
      setLoading(false)
    }).catch(function (err) {
      setLoading(false)
    })
  }, [isAdmin, user, fetchTenants, fetchAllUsers, fetchReservations, fetchProperties])

  useEffect(function () { loadTenants() }, [loadTenants])
  useEffect(function () {
    function handleVisibility() {
      if (document.hidden) { wasHiddenRef.current = true }
      else if (wasHiddenRef.current) { wasHiddenRef.current = false; loadTenants() }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function () { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadTenants])

  if (!user || (!isAdmin && !isOwner)) return <Navigate to="/login" replace />

  const FILTERS = isAdmin ? [
    { label: 'All Users',          val: 'All' },
    { label: 'Tenants',            val: 'tenant' },
    { label: 'Homeowners',         val: 'owner' },
  ] : [
    { label: 'All',                val: 'All' },
    { label: 'Students',           val: 'student' },
    { label: 'Professionals',      val: 'professional' },
    { label: 'Government',         val: 'government_employee' },
    { label: 'Visitors',           val: 'visitor' },
  ]

  var filtered = tenants.filter(function (t) {
    var q = query.toLowerCase()
    if (q && !(t.full_name || '').toLowerCase().includes(q) && !(t.email || '').toLowerCase().includes(q)) return false
    if (filter !== 'All') {
      if (isAdmin && t.role !== filter) return false
      if (!isAdmin && (t.tenant_type || '') !== filter) return false
    }
    return true
  })

  const counts = isAdmin ? {
    total: tenants.length,
    tenant: tenants.filter((t) => t.role === 'tenant').length,
    owner: tenants.filter((t) => t.role === 'owner').length,
  } : {
    total:   tenants.length,
    student: tenants.filter((t) => t.tenant_type === 'student').length,
    professional: tenants.filter((t) => t.tenant_type === 'professional').length,
    government_employee: tenants.filter((t) => t.tenant_type === 'government_employee').length,
    visitor: tenants.filter((t) => t.tenant_type === 'visitor').length,
  }

  const STAT_ITEMS = isAdmin ? [
    { label: 'Total Users', value: counts.total,  accent: '#0F6E56', bg: '#E1F5EE', icon: <Users size={16} /> },
    { label: 'Tenants',     value: counts.tenant, accent: '#3B82F6', bg: '#EFF6FF', icon: <Users size={16} /> },
    { label: 'Homeowners',  value: counts.owner,  accent: '#F59E0B', bg: '#FEF3C7', icon: <Building2 size={16} /> },
  ] : [
    { label: 'Total Tenants',   value: counts.total,               accent: '#0F6E56', bg: '#E1F5EE', icon: <Users size={16} /> },
    { label: 'Students',        value: counts.student,             accent: '#7C3AED', bg: '#EDE9FE', icon: <GraduationCap size={16} /> },
    { label: 'Professionals',   value: counts.professional,        accent: '#0F6E56', bg: '#E1F5EE', icon: <Briefcase size={16} /> },
    { label: 'Government',      value: counts.government_employee, accent: '#D97706', bg: '#FEF3C7', icon: <Building2 size={16} /> },
    { label: 'Visitors',        value: counts.visitor,             accent: '#78716C', bg: '#F5F4F0', icon: <Globe size={16} /> },
  ]

  return (
    <div className="page-enter">
      <Topbar title={isAdmin ? 'User Management' : 'My Tenants'} />

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="flex overflow-x-auto pb-1 sm:pb-0 snap-x hide-scrollbar gap-2 sm:gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-5">
          {STAT_ITEMS.map(function (s) {
            return (
              <div key={s.label}
                className="flex-shrink-0 w-[140px] sm:w-auto snap-start bg-white rounded-xl sm:rounded-2xl border border-stone-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg, color: s.accent }}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-400 leading-tight truncate">{s.label}</p>
                  <p className="font-bold text-lg sm:text-2xl leading-tight truncate" style={{ color: s.accent }}>{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap">
          <div className="relative w-full sm:w-64 flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input className="w-full pl-9" placeholder={isAdmin ? "Search users…" : "Search tenants…"} value={query}
              onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 snap-x hide-scrollbar flex-1">
            {FILTERS.map(function (f) {
              return (
                <button
                  key={f.val}
                  onClick={() => setFilter(f.val)}
                  className={'flex-shrink-0 snap-start px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium border transition-all duration-150 ' +
                    (filter === f.val
                      ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-300'
                      : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700')}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 sm:ml-auto w-full sm:w-auto text-right">{filtered.length} {isAdmin ? 'user' : 'tenant'}{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl shimmer flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 shimmer rounded w-3/4" />
                    <div className="h-3 shimmer rounded w-1/2" />
                  </div>
                </div>
                <div className="h-px bg-stone-100" />
                <div className="space-y-2">
                  <div className="h-3 shimmer rounded w-2/3" />
                  <div className="h-3 shimmer rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users size={28} className="text-stone-300" />
            </div>
            <p className="text-stone-600 font-semibold text-base">No tenants found</p>
            <p className="text-sm text-stone-400 mt-1">
              {isOwner ? 'Tenants who reserve your properties will appear here.' : 'No tenants registered in the system yet.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {filtered.map(function (t) {
              return <TenantCard key={t.id} t={t} isAdmin={isAdmin} onAction={(u, st) => setActionUser({ user: u, status: st })} onViewProfile={setSelectedProfile} />
            })}
          </div>
        )}
      </div>

      {/* Admin Action Modal */}
      {actionUser && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setActionUser(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-bold text-lg text-stone-800 mb-2">
              {actionUser.status === 'banned' ? 'Ban User?' : actionUser.status === 'suspended' ? 'Suspend User?' : 'Activate User?'}
            </h3>
            <p className="text-sm text-stone-600 mb-6">
              Are you sure you want to change the status of <strong>{actionUser.user.full_name}</strong> to {actionUser.status}?
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 border border-stone-200" onClick={() => setActionUser(null)}>Cancel</Button>
              <Button 
                className="flex-1 text-white" 
                style={{ background: actionUser.status === 'active' ? '#0F6E56' : actionUser.status === 'suspended' ? '#D97706' : '#DC2626' }}
                onClick={() => {
                  setLoading(true)
                  updateUserStatus(actionUser.user.id, actionUser.status).then(() => {
                    setActionUser(null)
                    loadTenants()
                  })
                }}
              >
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Profile Modals */}
      {selectedProfile && selectedProfile.role === 'owner' ? (
        <HomeownerProfileModal
          owner={{
            owner_name: selectedProfile.full_name,
            owner_avatar: selectedProfile.avatar_url,
            owner_email: selectedProfile.email,
            owner_contact: selectedProfile.contact,
            owner_municipality: selectedProfile.municipality
          }}
          onClose={() => setSelectedProfile(null)}
        />
      ) : selectedProfile ? (
        <TenantProfileModal 
          tenant={{
            tenant_name: selectedProfile.full_name,
            tenant_avatar: selectedProfile.avatar_url,
            tenant_email: selectedProfile.email,
            tenant_contact: selectedProfile.contact,
            tenant_municipality: selectedProfile.municipality
          }} 
          onClose={() => setSelectedProfile(null)} 
        />
      ) : null}
    </div>
  )
}
