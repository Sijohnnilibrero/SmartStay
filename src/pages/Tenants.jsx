import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate, Navigate, useSearchParams } from 'react-router-dom'
import { Button, Input, FilterChip } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
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

function TenantCard({ t, isAdmin, isSuperAdmin, onAction, onViewProfile }) {
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
          <p 
            className="font-semibold text-stone-800 text-[14px] truncate pr-8 cursor-pointer hover:underline hover:text-[--teal] transition-colors"
            onClick={() => onViewProfile(t)}
          >
            {t.full_name}
          </p>
          <div className="flex items-center gap-1 mt-0.5 flex-wrap">
            <span
              className="inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full"
              style={{ background: color.bg, color: color.text }}
            >
              {isAdmin ? (t.role === 'owner' ? 'Homeowner' : 'Tenant') : color.label}
            </span>
            {isAdmin && t.status && t.status !== 'active' && (
              <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${
                t.status === 'permanently_banned' ? 'bg-stone-900 text-white'
                : t.status === 'banned' ? 'bg-red-100 text-red-700'
                : 'bg-amber-100 text-amber-700'
              }`}>
                {t.status === 'permanently_banned' ? 'PERM. CLOSED'
                 : t.status === 'banned' ? 'DEACTIVATED'
                 : 'UNDER REVIEW'}
              </span>
            )}
          </div>
        </div>
        <button 
          onClick={() => onViewProfile(t)}
          className="absolute top-4 right-4 p-2 text-stone-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
          title="View Profile"
        >
          <Eye size={16} />
        </button>
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
        <div className="mt-1 pt-3 border-t border-stone-100 flex gap-1.5 flex-wrap">
          {t.status !== 'active' ? (
            <Button size="sm" variant="ghost" className="flex-1 text-[11px] text-[#0F6E56] hover:bg-[#E1F5EE]" onClick={() => onAction(t, 'active')}>
              Restore
            </Button>
          ) : (
            <Button size="sm" variant="ghost" className="flex-1 text-[11px] text-amber-600 hover:bg-amber-50" onClick={() => onAction(t, 'suspended')}>
              Review
            </Button>
          )}
          {t.status !== 'banned' && t.status !== 'permanently_banned' && (
            <Button size="sm" variant="ghost" className="flex-1 text-[11px] text-red-600 hover:bg-red-50" onClick={() => onAction(t, 'banned')}>
              Deactivate
            </Button>
          )}
          {isSuperAdmin && t.status !== 'permanently_banned' && (
            <Button size="sm" variant="ghost" className="flex-1 text-[11px] text-stone-900 hover:bg-stone-100 font-bold" onClick={() => onAction(t, 'permanently_banned')}>
              Perm. Close
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
  var isSuperAdmin = useAuthStore(function (s) { return s.isSuperAdmin })

  var fetchTenants = useAuthStore(function (s) { return s.fetchTenants })
  var fetchAllUsers = useAuthStore(function (s) { return s.fetchAllUsers })
  var updateUserStatus = useAuthStore(function (s) { return s.updateUserStatus })
  var fetchReservations = useAuthStore(function (s) { return s.fetchReservations })
  var fetchProperties = useAuthStore(function (s) { return s.fetchProperties })
  var { addToast } = useAppStore()

  const [searchParams, setSearchParams] = useSearchParams()
  const roleParam = searchParams.get('role')
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState(roleParam || 'All')
  const [tenants, setTenants] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (roleParam && (roleParam === 'tenant' || roleParam === 'owner' || roleParam === 'All')) {
      setFilter(roleParam)
    }
  }, [roleParam])
  const [actionUser, setActionUser] = useState(null)
  const [isActioning, setIsActioning] = useState(false)
  const [banReasonPreset, setBanReasonPreset] = useState('Fraudulent or invalid documents / permits')
  const [customReasonText, setCustomReasonText] = useState('')
  const [confirmWord, setConfirmWord] = useState('')

  const handleOpenActionModal = (userObj, status) => {
    setActionUser({ user: userObj, status })
    setBanReasonPreset('Fraudulent or invalid documents / permits')
    setCustomReasonText('')
    setConfirmWord('')
  }
  const [selectedProfile, setSelectedProfile] = useState(null)
  const wasHiddenRef = useRef(false)

  var loadTenants = useCallback(function (silent = false) {
    if (!silent) setLoading(true)
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
      if (!silent) setLoading(false)
    }).catch(function (err) {
      if (!silent) setLoading(false)
    })
  }, [isAdmin, user, fetchTenants, fetchAllUsers, fetchReservations, fetchProperties])

  useEffect(function () { loadTenants() }, [loadTenants])
  useEffect(function () {
    function handleVisibility() {
      if (document.hidden) { wasHiddenRef.current = true }
      else if (wasHiddenRef.current) { wasHiddenRef.current = false; loadTenants(true) }
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
      {/* Sticky Search & Filter Toolbar - Flush with header, zero gap */}
      <div 
        className="sticky top-14 z-20 px-4 sm:px-6 py-2.5 backdrop-blur-md border-b flex flex-col sm:flex-row sm:items-center gap-3 flex-wrap transition-colors shadow-sm"
        style={{ backgroundColor: 'var(--surface-header)', borderColor: 'var(--border-default)' }}
      >
        <div className="relative w-full sm:w-64 flex-shrink-0">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <Input className="w-full pl-9" placeholder={isAdmin ? "Search users…" : "Search tenants…"} value={query}
            onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 snap-x hide-scrollbar flex-1">
          {FILTERS.map(function (f) {
            const count = f.val === 'All' ? counts.total : counts[f.val]
            return (
              <div key={f.val} className="flex-shrink-0 snap-start">
                <FilterChip
                  label={f.label}
                  count={count ?? 0}
                  active={filter === f.val}
                  onClick={() => {
                    setFilter(f.val)
                    if (roleParam) {
                      searchParams.delete('role')
                      setSearchParams(searchParams)
                    }
                  }}
                  color="teal"
                />
              </div>
            )
          })}
        </div>
        <p className="text-[10px] sm:text-[11px] text-stone-400 sm:ml-auto w-full sm:w-auto text-right">{filtered.length} {isAdmin ? 'user' : 'tenant'}{filtered.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
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
              return <TenantCard key={t.id} t={t} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onAction={handleOpenActionModal} onViewProfile={setSelectedProfile} />
            })}
          </div>
        )}
      </div>

      {/* Admin Action Modal — 3-Tier Moderation */}
      {actionUser && (() => {
        const s = actionUser.status
        const isPermanent = s === 'permanently_banned'
        const isBan = s === 'banned'
        const isSuspend = s === 'suspended'
        const isRestore = s === 'active'

        const accentBg   = isPermanent ? '#1C1917' : isBan ? '#DC2626' : isSuspend ? '#D97706' : '#0F6E56'
        const accentLight = isPermanent ? '#F5F4F0' : isBan ? '#FEF2F2' : isSuspend ? '#FEF3C7' : '#E1F5EE'
        const emoji      = isPermanent ? '⛔' : isBan ? '🔒' : isSuspend ? '⏸️' : '✅'
        const title      = isPermanent ? 'Permanently Close Account'
                         : isBan      ? 'Deactivate User Account'
                         : isSuspend  ? 'Place Account Under Review'
                         : 'Restore Account Access'

        // Friction validation
        const confirmOk = isPermanent
          ? confirmWord.trim() === actionUser.user.full_name
          : isBan
          ? confirmWord.trim().toUpperCase() === 'CONFIRM'
          : true // suspend & restore need no confirmation word

        return (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn" onClick={() => setActionUser(null)}>
            <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-stone-200 dark:border-white/10 space-y-4 animate-scaleUp" onClick={(e) => e.stopPropagation()}>

              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm flex-shrink-0"
                  style={{ background: accentLight, color: accentBg }}>
                  {emoji}
                </div>
                <div>
                  <h3 className="font-bold text-base text-stone-900 dark:text-white">{title}</h3>
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    Target: <strong className="text-stone-800 dark:text-stone-200">{actionUser.user.full_name}</strong> ({actionUser.user.email || 'No email'})
                  </p>
                </div>
              </div>

              {/* Tier 1: Restore */}
              {isRestore && (
                <div className="p-3.5 rounded-2xl bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-900/60 text-xs text-teal-900 dark:text-teal-200">
                  This will lift all restrictions and restore <strong>{actionUser.user.full_name}</strong>'s full access to SmartStay.
                  Provide an optional reactivation note below for the audit log.
                  <textarea rows={2} value={customReasonText} onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Optional: reason for reactivation (audit log only)..."
                    className="mt-2 w-full p-2.5 rounded-xl border border-teal-200 dark:border-teal-800 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/30" />
                </div>
              )}

              {/* Tier 2: Suspend — reason required, no friction word */}
              {isSuspend && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-[11px] text-amber-900 dark:text-amber-200">
                    ⏸️ <strong>Under Review</strong> — This is temporary. The user can still submit an appeal. Admins can lift this at any time.
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">Reason for Review</label>
                    <select value={banReasonPreset} onChange={(e) => setBanReasonPreset(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-500/30 cursor-pointer">
                      <option value="Pending document verification">📄 Pending document verification</option>
                      <option value="Reported behavior under investigation">🔍 Reported behavior under investigation</option>
                      <option value="Non-payment or payment dispute">💳 Non-payment or payment dispute</option>
                      <option value="Minor policy violation (first offense)">⚠️ Minor policy violation (first offense)</option>
                      <option value="other">📝 Other (write below)</option>
                    </select>
                  </div>
                  <textarea rows={2} value={customReasonText} onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Additional notes for the user and audit log..."
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-amber-500/30" />
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 italic">This reason will be shown to the user when they attempt to log in.</p>
                </div>
              )}

              {/* Tier 3: Deactivate (ban) — requires typing CONFIRM */}
              {isBan && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[11px] text-red-900 dark:text-red-200">
                    🔒 <strong>Deactivation</strong> — The user's account will be locked. They can still submit a support appeal for review.
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-700 dark:text-stone-300">Primary Reason</label>
                    <select value={banReasonPreset} onChange={(e) => setBanReasonPreset(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-red-500/30 cursor-pointer">
                      <option value="Fraudulent or invalid documents / permits">🚫 Fraudulent or invalid documents / permits</option>
                      <option value="Multiple verified policy violations">⚖️ Multiple verified policy violations</option>
                      <option value="Safety, harassment, or disruptive behavior">⚠️ Safety, harassment, or disruptive behavior</option>
                      <option value="Non-payment or breach of lease agreement">💳 Non-payment or breach of lease agreement</option>
                      <option value="other">📝 Other (write below)</option>
                    </select>
                  </div>
                  <textarea rows={2} value={customReasonText} onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Additional context for the user and audit log..."
                    className="w-full p-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500/30" />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-red-700 dark:text-red-400">
                      Type <span className="font-mono bg-red-100 dark:bg-red-950 px-1.5 py-0.5 rounded">CONFIRM</span> to proceed
                    </label>
                    <input type="text" value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)}
                      placeholder="Type CONFIRM"
                      className="w-full h-9 px-3 rounded-xl border border-red-200 dark:border-red-900 bg-white dark:bg-stone-800 text-xs font-mono text-red-800 dark:text-red-300 focus:outline-none focus:ring-2 focus:ring-red-500/40" />
                  </div>
                </div>
              )}

              {/* Tier 4: Permanently Close — super admin only, requires full name */}
              {isPermanent && (
                <div className="space-y-3 pt-1">
                  <div className="p-3 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-[11px] text-stone-800 dark:text-stone-200">
                    ⛔ <strong>Permanent Closure</strong> — This action is irreversible from the admin panel. Only a Super Admin can undo this. No appeal button will be shown to the user.
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-800 dark:text-stone-200">Reason (required)</label>
                    <select value={banReasonPreset} onChange={(e) => setBanReasonPreset(e.target.value)}
                      className="w-full h-10 px-3 text-xs font-semibold rounded-xl border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-stone-500/30 cursor-pointer">
                      <option value="Confirmed identity fraud or platform scam">🕵️ Confirmed identity fraud or platform scam</option>
                      <option value="Serious safety threat to residents or staff">🆘 Serious safety threat to residents or staff</option>
                      <option value="Repeat offender after prior deactivation">🔁 Repeat offender after prior deactivation</option>
                      <option value="other">📝 Other (write below)</option>
                    </select>
                  </div>
                  <textarea rows={2} value={customReasonText} onChange={(e) => setCustomReasonText(e.target.value)}
                    placeholder="Mandatory: detailed audit reason..."
                    className="w-full p-3 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-xs text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-stone-500/30" />
                  <div className="space-y-1.5">
                    <label className="block text-xs font-bold text-stone-900 dark:text-stone-200">
                      Type the user's full name <span className="font-mono bg-stone-200 dark:bg-stone-700 px-1.5 py-0.5 rounded text-stone-700 dark:text-stone-300">{actionUser.user.full_name}</span> to confirm
                    </label>
                    <input type="text" value={confirmWord} onChange={(e) => setConfirmWord(e.target.value)}
                      placeholder={`Type: ${actionUser.user.full_name}`}
                      className="w-full h-9 px-3 rounded-xl border border-stone-400 dark:border-stone-600 bg-white dark:bg-stone-800 text-xs font-mono text-stone-800 dark:text-stone-200 focus:outline-none focus:ring-2 focus:ring-stone-500/40" />
                  </div>
                </div>
              )}

              {/* Footer Buttons */}
              <div className="flex gap-2.5 pt-2 border-t border-stone-100 dark:border-white/10">
                <Button variant="outline" className="flex-1 text-xs cursor-pointer" onClick={() => setActionUser(null)}>
                  Cancel
                </Button>
                <Button
                  className="flex-[1.5] text-white text-xs font-bold cursor-pointer"
                  style={{ background: accentBg, opacity: confirmOk ? 1 : 0.4 }}
                  disabled={isActioning || !confirmOk}
                  onClick={() => {
                    let fullReason = null
                    if (!isRestore) {
                      const preset = banReasonPreset === 'other' ? '' : banReasonPreset
                      const extra = customReasonText.trim()
                      fullReason = preset ? (extra ? `${preset} — ${extra}` : preset) : extra || 'Administrative restriction'
                    }
                    setIsActioning(true)
                    updateUserStatus(actionUser.user.id, s, isRestore ? (customReasonText.trim() || null) : fullReason)
                      .then(() => {
                        setIsActioning(false)
                        setActionUser(null)
                        addToast(
                          isRestore ? `${actionUser.user.full_name}'s account has been restored.`
                          : isSuspend ? `${actionUser.user.full_name} placed under review.`
                          : isBan    ? `${actionUser.user.full_name}'s account deactivated.`
                          : `${actionUser.user.full_name}'s account permanently closed.`,
                          'success'
                        )
                        loadTenants(true)
                      })
                      .catch((err) => {
                        setIsActioning(false)
                        console.error('updateUserStatus error:', err)
                        addToast(err?.message || 'Failed to update user status. Check Supabase RLS policies.', 'error')
                      })
                  }}
                >
                  {isActioning ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>Processing...</span>
                    </div>
                  ) : isRestore ? 'Confirm Restoration'
                    : isSuspend ? 'Place Under Review'
                    : isBan    ? 'Deactivate Account'
                    : 'Permanently Close Account'}
                </Button>
              </div>

            </div>
          </div>
        )
      })()}

      {/* Profile Modals */}
      {/* Profile Modals */}
      {selectedProfile && selectedProfile.role === 'owner' ? (
        <HomeownerProfileModal
          owner={{
            id: selectedProfile.id,
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
          isOpen={true}
          tenantId={selectedProfile.id}
          onClose={() => setSelectedProfile(null)} 
        />
      ) : null}
    </div>
  )
}
