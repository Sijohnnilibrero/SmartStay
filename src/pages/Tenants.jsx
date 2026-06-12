import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import Topbar from '@/components/layout/Topbar'
import { Button, Input } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import {
  Search, Users, GraduationCap, Briefcase, Building2, Globe,
  MapPin, Calendar, Mail,
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

function TenantCard({ t }) {
  const color = TYPE_COLORS[t.tenant_type] || { bg: '#F5F4F0', text: '#78716C', label: t.tenant_type || 'Tenant' }
  const icon  = TYPE_ICONS[t.tenant_type] || <Users size={14} />
  const initials = (t.full_name || '??').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-stone-200 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col gap-3">
      {/* Top: avatar + name */}
      <div className="flex items-center gap-3">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-[15px] font-bold flex-shrink-0 shadow-sm"
          style={{ background: color.bg, color: color.text }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-stone-800 text-[14px] truncate">{t.full_name}</p>
          <div className="flex items-center gap-1 mt-0.5">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: color.bg, color: color.text }}
            >
              {icon}
              {color.label}
            </span>
          </div>
        </div>
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
    </div>
  )
}

export default function Tenants() {
  var user = useAuthStore(function (s) { return s.user })
  var isAdmin = useAuthStore(function (s) { return s.isAdmin })
  var isOwner = useAuthStore(function (s) { return s.isOwner })

  var fetchTenants = useAuthStore(function (s) { return s.fetchTenants })
  var fetchReservations = useAuthStore(function (s) { return s.fetchReservations })
  var fetchProperties = useAuthStore(function (s) { return s.fetchProperties })

  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('All')
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)
  const wasHiddenRef = useRef(false)

  var loadTenants = useCallback(function () {
    setLoading(true)
    Promise.all([
      fetchTenants.apply(null, isAdmin ? [] : [user.id]),
      fetchReservations(),
      fetchProperties(),
    ]).then(function (results) {
      var allTenants = results[0] || []
      if (!isAdmin && user) {
        var myProps = (results[2] || []).filter(function (p) { return p.owner_id === user.id })
        var myPropIds = myProps.map(function (p) { return p.id })
        var myResIds = (results[1] || []).filter(function (r) { return myPropIds.indexOf(r.property_id) !== -1 }).map(function (r) { return r.tenant_id })
        setTenants(allTenants.filter(function (t) { return myResIds.indexOf(t.id) !== -1 }))
      } else {
        setTenants(allTenants)
      }
      setLoading(false)
    }).catch(function (err) {
      console.error('Failed to load tenants:', err)
      setLoading(false)
    })
  }, [isAdmin, user, fetchTenants, fetchReservations, fetchProperties])

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

  const FILTERS = [
    { label: 'All',                val: 'All' },
    { label: 'Students',           val: 'student' },
    { label: 'Professionals',      val: 'professional' },
    { label: 'Government',         val: 'government_employee' },
    { label: 'Visitors',           val: 'visitor' },
  ]

  var filtered = tenants.filter(function (t) {
    var q = query.toLowerCase()
    if (q && !(t.full_name || '').toLowerCase().includes(q) && !(t.email || '').toLowerCase().includes(q)) return false
    if (filter !== 'All' && (t.tenant_type || '') !== filter) return false
    return true
  })

  const counts = {
    total:   tenants.length,
    student: tenants.filter((t) => t.tenant_type === 'student').length,
    professional: tenants.filter((t) => t.tenant_type === 'professional').length,
    government_employee: tenants.filter((t) => t.tenant_type === 'government_employee').length,
    visitor: tenants.filter((t) => t.tenant_type === 'visitor').length,
  }

  const STAT_ITEMS = [
    { label: 'Total Tenants',   value: counts.total,               accent: '#0F6E56', bg: '#E1F5EE', icon: <Users size={16} /> },
    { label: 'Students',        value: counts.student,             accent: '#7C3AED', bg: '#EDE9FE', icon: <GraduationCap size={16} /> },
    { label: 'Professionals',   value: counts.professional,        accent: '#0F6E56', bg: '#E1F5EE', icon: <Briefcase size={16} /> },
    { label: 'Government',      value: counts.government_employee, accent: '#D97706', bg: '#FEF3C7', icon: <Building2 size={16} /> },
    { label: 'Visitors',        value: counts.visitor,             accent: '#78716C', bg: '#F5F4F0', icon: <Globe size={16} /> },
  ]

  return (
    <div className="page-enter">
      <Topbar title={isAdmin ? 'Tenant Management' : 'My Tenants'} />

      <div className="p-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-5 gap-3">
          {STAT_ITEMS.map(function (s) {
            return (
              <div key={s.label}
                className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg, color: s.accent }}>
                  {s.icon}
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 leading-tight">{s.label}</p>
                  <p className="font-bold text-2xl leading-tight" style={{ color: s.accent }}>{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Search + Filter */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input className="pl-9" placeholder="Search tenants…" value={query}
              onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map(function (f) {
              return (
                <button
                  key={f.val}
                  onClick={() => setFilter(f.val)}
                  className={'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all duration-150 ' +
                    (filter === f.val
                      ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-300'
                      : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700')}
                >
                  {f.label}
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-stone-400 ml-auto">{filtered.length} tenant{filtered.length !== 1 ? 's' : ''}</p>
        </div>

        {/* Cards */}
        {loading ? (
          <div className="grid grid-cols-3 gap-4">
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
          <div className="grid grid-cols-3 gap-4">
            {filtered.map(function (t) {
              return <TenantCard key={t.id} t={t} />
            })}
          </div>
        )}
      </div>
    </div>
  )
}
