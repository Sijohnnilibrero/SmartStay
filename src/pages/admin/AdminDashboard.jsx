import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { supabase } from '@/lib/supabase'
import { Users, Home, Shield, AlertTriangle, Headphones } from 'lucide-react'
import PropertyMap from '@/components/map/PropertyMap'
import { formatCurrency } from '@/lib/utils'

const MUNICIPALITIES = ['Basco', 'Mahatao', 'Ivana', 'Uyugan', 'Sabtang', 'Itbayat']
const COLORS = ['#1D9E75', '#534AB7', '#BA7517', '#D85A30', '#0F6E56', '#7C3AED']

export default function AdminDashboard() {
  const [stats, setStats] = useState([])
  const [recent, setRecent] = useState([])
  const [permitStats, setPermitStats] = useState({ valid: 0, expiring: 0, expired: 0, actionList: [] })
  const [activeProperties, setActiveProperties] = useState([])
  const [openTicketsCount, setOpenTicketsCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [mapIsland, setMapIsland] = useState('Batan')
  const navigate = useNavigate()
  const wasHiddenRef = useRef(false)
  const user = useAuthStore(s => s.user)

  const mapCenters = {
    'Batan': [20.4485, 121.9708],
    'Sabtang': [20.3153, 121.8672],
    'Itbayat': [20.7907, 121.8484],
  }

  const loadData = useCallback(function(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([
      useAuthStore.getState().fetchAllUsers(),
      useAuthStore.getState().fetchProperties(),
      useAuthStore.getState().fetchSupportTickets({ status: 'open' }),
    ]).then(function(results) {
      const userState = useAuthStore.getState().user
      var users = results[0] || []
      var properties = results[1] || []
      var openTickets = results[2] || []

      setOpenTicketsCount(openTickets.length)

      if (userState?.role === 'admin' && userState?.admin_region) {
        if (userState.admin_region === 'Batan Island') {
          users = users.filter(u => ['Basco', 'Mahatao', 'Ivana', 'Uyugan'].includes(u.municipality))
          properties = properties.filter(p => ['Basco', 'Mahatao', 'Ivana', 'Uyugan'].includes(p.municipality))
        } else {
          users = users.filter(u => u.municipality === userState.admin_region)
          properties = properties.filter(p => p.municipality === userState.admin_region)
        }
      }

      const activeList = properties.filter(function(p) { return p.status === 'approved' || p.status === 'active' })
      const pendingProps = properties.filter(p => p.status === 'pending_review')

      setStats([
        { label: 'Total Tenants', value: users.filter(function(u) { return u.role === 'tenant' }).length, icon: Users, color: 'blue', link: '/admin/users?role=tenant' },
        { label: 'Total Homeowners', value: users.filter(function(u) { return u.role === 'owner' }).length, icon: Home, color: 'purple', link: '/admin/users?role=owner' },
        { label: 'Active Properties', value: activeList.length, icon: Home, color: 'emerald', link: '/admin/properties' },
        { label: 'Support Tickets', value: openTickets.length, icon: Headphones, color: 'amber', link: '/admin/support' },
      ])
      
      setRecent(pendingProps.slice(0, 5))

      var now = new Date()
      var thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

      var expiredList = activeList.filter(function(p) {
        if (!p.permit_expires_on) return false
        return new Date(p.permit_expires_on) < now
      })
      var expiringList = activeList.filter(function(p) {
        if (!p.permit_expires_on) return false
        var expDate = new Date(p.permit_expires_on)
        return expDate >= now && expDate <= thirtyDays
      })
      var validList = activeList.filter(function(p) {
        if (!p.permit_expires_on) return true
        return new Date(p.permit_expires_on) > thirtyDays
      })

      setPermitStats({
        valid: validList.length,
        expiring: expiringList.length,
        expired: expiredList.length,
        actionList: [...expiredList, ...expiringList],
      })

      setActiveProperties(activeList)

      if (!silent) setLoading(false)
    })
  }, [])

  useEffect(function() { loadData() }, [loadData])

  useEffect(function() {
    const channel = supabase
      .channel('admin-dashboard-support-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'support_tickets' },
        function() {
          loadData(true)
        }
      )
      .subscribe()

    return function() {
      supabase.removeChannel(channel)
    }
  }, [loadData])

  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadData(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function() { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadData])


  // --- Analytics Processing ---
  const isSuperAdmin = user?.role === 'super_admin'
  const adminRegion = user?.admin_region || 'Batan Island'

  const ALL_MUNICIPALITIES = [
    { name: 'Basco', island: 'Batan', color: '#1D9E75' },
    { name: 'Mahatao', island: 'Batan', color: '#0F6E56' },
    { name: 'Ivana', island: 'Batan', color: '#534AB7' },
    { name: 'Uyugan', island: 'Batan', color: '#7C3AED' },
    { name: 'Sabtang', island: 'Sabtang', color: '#BA7517' },
    { name: 'Itbayat', island: 'Itbayat', color: '#D85A30' },
  ]

  // Filter municipalities strictly for this admin's island
  const scopedMunicipalities = isSuperAdmin
    ? ALL_MUNICIPALITIES
    : ALL_MUNICIPALITIES.filter(m => {
        if (adminRegion.includes('Sabtang')) return m.island === 'Sabtang'
        if (adminRegion.includes('Itbayat')) return m.island === 'Itbayat'
        return m.island === 'Batan'
      })

  const muniStats = scopedMunicipalities.map(m => {
    const props = activeProperties.filter(p => p.municipality === m.name)
    return {
      ...m,
      count: props.length,
    }
  })

  const activeMuniCount = muniStats.filter(m => m.count > 0).length

  // Scoped map regions
  const availableIslands = isSuperAdmin
    ? ['Batan', 'Sabtang', 'Itbayat']
    : adminRegion.includes('Sabtang')
    ? ['Sabtang']
    : adminRegion.includes('Itbayat')
    ? ['Itbayat']
    : ['Batan']

  useEffect(() => {
    if (!isSuperAdmin) {
      if (adminRegion.includes('Sabtang')) setMapIsland('Sabtang')
      else if (adminRegion.includes('Itbayat')) setMapIsland('Itbayat')
      else setMapIsland('Batan')
    }
  }, [isSuperAdmin, adminRegion])


  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-6">
        <div className="h-8 bg-stone-200/50 rounded w-1/4"></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-stone-200/50 rounded-2xl"></div>)}
        </div>
        <div className="h-[400px] bg-stone-200/50 rounded-3xl"></div>
      </div>
    )
  }

  return (
    <div className="page-enter p-6 space-y-6 relative z-10">
        
        {/* Urgent Customer Support / Account Appeals Alert Banner */}
        {openTicketsCount > 0 && (
          <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800/80 flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-600 text-white shadow-sm flex-shrink-0">
                <Headphones size={18} />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-stone-900 dark:text-stone-100">
                  {openTicketsCount} Open Customer Service Ticket{openTicketsCount !== 1 ? 's' : ''} & Appeals
                </h4>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Tenants, homeowners, or account appeals are awaiting review and response.
                </p>
              </div>
            </div>
            <Link
              to="/admin/support"
              className="px-3.5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm flex-shrink-0 flex items-center gap-1.5"
            >
              <span>Open Helpdesk</span>
              <span>→</span>
            </Link>
          </div>
        )}

        {/* KPI Row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 select-none">
          {stats.map(function(s) {
            const accentColor = s.color === 'blue' ? '#534AB7' : s.color === 'purple' ? '#7C3AED' : s.color === 'emerald' ? '#1D9E75' : '#BA7517'
            return (
              <Card 
                key={s.label} 
                onClick={() => s.link && navigate(s.link)}
                className="p-4 sm:p-5 flex flex-col justify-between glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 cursor-pointer group" 
                style={{ borderLeftColor: accentColor }}
              >
                <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <s.icon size={16} style={{ color: accentColor }} />
                    <p className="text-[10px] sm:text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 font-bold truncate">{s.label}</p>
                  </div>
                  <span className="text-stone-300 dark:text-stone-600 group-hover:text-stone-700 dark:group-hover:text-stone-200 group-hover:translate-x-0.5 transition-all text-xs font-bold">→</span>
                </div>
                <p className="font-extrabold text-2xl sm:text-3xl" style={{ color: accentColor }}>{s.value}</p>
              </Card>
            )
          })}
        </div>

        {/* Row 2: Analytics & Map Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 sm:gap-6 flex-1">
          
          {/* Properties per Municipality - Clean Scoped Table */}
          <Card className="p-5 sm:p-6 glass-card lg:col-span-3 hover:shadow-md transition-shadow">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="font-extrabold text-stone-900 dark:text-white flex items-center gap-2 text-base">
                  <Home size={18} className="text-[#1D9E75]" /> 
                  {isSuperAdmin ? 'Provincial Coverage & Properties' : `${adminRegion.replace(' Island', '')} Island Coverage`}
                </h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                  {isSuperAdmin ? 'All Batanes municipalities' : `Monitoring assigned municipalities in ${adminRegion}`}
                </p>
              </div>
              <span className="self-start sm:self-auto text-[11px] font-bold px-2.5 py-1 rounded-full bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
                {activeMuniCount} of {scopedMunicipalities.length} Municipalities Active
              </span>
            </div>

            {/* Clean, high-contrast overview table */}
            <div className="overflow-x-auto rounded-xl border" style={{ borderColor: 'var(--border-default)', backgroundColor: 'var(--surface-bg)' }}>
              <table className="w-full text-left text-xs sm:text-sm">
                <thead>
                  <tr className="border-b font-bold uppercase tracking-wider text-[10px] sm:text-[11px]" style={{ backgroundColor: 'var(--surface-thead)', borderColor: 'var(--border-default)', color: 'var(--text-muted)' }}>
                    <th className="py-2.5 px-3 sm:px-4">Municipality</th>
                    <th className="py-2.5 px-3 sm:px-4 text-center">Properties</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Coverage Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                  {muniStats.map((m) => {
                    const isActive = m.count > 0
                    return (
                      <tr 
                        key={m.name} 
                        onClick={() => navigate(`/admin/properties?municipality=${encodeURIComponent(m.name)}`)}
                        className="transition-colors cursor-pointer group" 
                        style={{ borderColor: 'var(--border-divider)' }}
                        title={`View properties in ${m.name}`}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}
                      >
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                            <div>
                              <p className="font-bold text-xs sm:text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{m.island} Island</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <span className={`inline-block font-bold text-xs sm:text-sm`} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-faint)' }}>
                            {m.count}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right">
                          {isActive ? (
                            <div className="inline-flex items-center gap-2 justify-end">
                              <Badge variant="teal" className="text-[10px] py-0.5 px-2 font-bold">Active</Badge>
                              <span className="text-stone-300 dark:text-stone-600 group-hover:text-teal-600 dark:group-hover:text-teal-400 group-hover:translate-x-0.5 transition-all text-xs font-semibold">
                                View listings →
                              </span>
                            </div>
                          ) : (
                            <Badge variant="gray" className="text-[10px] py-0.5 px-2">No Coverage</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mini Map Widget - Full Width with Floating Overlay Controls */}
          <Card className="p-0 overflow-hidden glass-card hover:shadow-md transition-shadow lg:col-span-2 relative min-h-[320px] flex flex-col">
            <div className="w-full flex-1 relative min-h-[320px]">
              <PropertyMap
                key={mapIsland}
                mode="browse"
                properties={activeProperties}
                initialCenter={mapCenters[mapIsland]}
                height="100%"
                onSelect={(id) => navigate(`/admin/property/${id}`)}
              />

              {/* Floating Region Switcher (Top Right) */}
              <div className="absolute top-3 right-3 z-10 flex items-center gap-1 p-1 rounded-xl bg-white/85 dark:bg-stone-900/85 backdrop-blur-md shadow-md border border-stone-200/60 dark:border-white/10">
                {availableIslands.map(island => (
                  <button
                    key={island}
                    onClick={() => setMapIsland(island)}
                    className={`py-1 px-2.5 rounded-lg text-[11px] font-bold transition-all ${
                      mapIsland === island
                        ? 'bg-[#1D9E75] text-white shadow-sm'
                        : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                    }`}
                  >
                    {island}
                  </button>
                ))}
              </div>

              {/* Floating Expand Map Button (Bottom Right) */}
              <button
                onClick={() => navigate('/admin/map')}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/90 dark:bg-stone-900/90 hover:bg-white dark:hover:bg-stone-800 text-[#534AB7] dark:text-[#a5b4fc] text-[11px] font-bold shadow-md border border-stone-200/60 dark:border-white/10 backdrop-blur-md transition-all group"
              >
                <span>Full Map</span>
                <span className="group-hover:translate-x-0.5 transition-transform">⤢</span>
              </button>
            </div>
          </Card>
        </div>

        {/* Action Items Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <Card className="lg:col-span-2 p-0 overflow-hidden glass-card">
            <div className="p-4 sm:p-5 border-b border-stone-200/50 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-stone-800/50">
              <h3 className="font-extrabold text-[13px] sm:text-base text-stone-900 dark:text-white uppercase tracking-wide">Pending Properties</h3>
              <Link to="/admin/properties?status=pending_review"><Button variant="ghost" size="sm" className="px-3 py-1.5 text-xs font-semibold text-[#534AB7] hover:bg-[#534AB7]/10">View all</Button></Link>
            </div>
            <div className="divide-y divide-stone-200/50 dark:divide-white/5 p-2 sm:p-0">
              {recent.map(function(r) {
                return (
                  <div 
                    key={r.id} 
                    onClick={() => navigate(`/admin/property/${r.id}`)}
                    className="px-3 py-3 sm:px-5 sm:py-4 flex items-center justify-between hover:bg-stone-50/50 dark:hover:bg-white/5 transition-colors cursor-pointer group"
                    title={`Review ${r.name}`}
                  >
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[12px] sm:text-[14px] font-bold text-stone-800 dark:text-stone-200 truncate group-hover:text-teal-600 transition-colors">
                        <span className="text-stone-900 dark:text-white">{r.name}</span> in <span className="text-[#1D9E75]">{r.municipality}</span>
                      </p>
                      <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">By {r.owner_name || 'Owner'}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="amber" className="text-[10px] px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold flex-shrink-0">Pending</Badge>
                      <span className="text-stone-300 dark:text-stone-600 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all text-xs font-bold">→</span>
                    </div>
                  </div>
                )
              })}
              {recent.length === 0 && <p className="text-xs sm:text-sm text-stone-400 text-center py-8 font-medium">No pending properties to review</p>}
            </div>
          </Card>

          <div className="space-y-4 sm:space-y-6">
            <Card className="p-5 glass-card border border-stone-200/50 dark:border-white/10 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      permitStats.expired > 0 
                        ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400' 
                        : permitStats.expiring > 0 
                          ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                          : 'bg-teal-50 dark:bg-teal-950/60 text-[#1D9E75]'
                    }`}>
                      {permitStats.expired > 0 || permitStats.expiring > 0 ? (
                        <AlertTriangle size={18} />
                      ) : (
                        <Shield size={18} />
                      )}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-stone-900 dark:text-white">LGU Permit Status</h4>
                      <p className="text-[11px] text-stone-500 dark:text-stone-400">
                        {permitStats.actionList.length === 0 ? 'All operating permits are valid' : `${permitStats.actionList.length} permit(s) require attention`}
                      </p>
                    </div>
                  </div>
                  {permitStats.actionList.length === 0 ? (
                    <Badge variant="teal" className="text-[10px] py-0.5 px-2 font-bold">Compliant</Badge>
                  ) : (
                    <Badge variant={permitStats.expired > 0 ? 'red' : 'amber'} className="text-[10px] py-0.5 px-2 font-bold">
                      {permitStats.expired > 0 ? `${permitStats.expired} Expired` : `${permitStats.expiring} Expiring`}
                    </Badge>
                  )}
                </div>

                {/* Concrete Status Breakdown */}
                <div className="space-y-2 text-xs pt-1">
                  <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                      <span className="text-stone-600 dark:text-stone-300 font-medium">Valid & Up-to-Date</span>
                    </div>
                    <span className="font-bold text-emerald-600 dark:text-emerald-400">{permitStats.valid} Stays</span>
                  </div>

                  <div className="flex items-center justify-between py-1.5 border-b border-stone-100 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${permitStats.expiring > 0 ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'}`}></span>
                      <span className="text-stone-600 dark:text-stone-300 font-medium">Expiring Soon</span>
                    </div>
                    <span className={`font-bold ${permitStats.expiring > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-stone-400 dark:text-stone-500'}`}>
                      {permitStats.expiring} Stays
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1.5">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${permitStats.expired > 0 ? 'bg-red-500' : 'bg-stone-300 dark:bg-stone-600'}`}></span>
                      <span className="text-stone-600 dark:text-stone-300 font-medium">Expired Permits</span>
                    </div>
                    <span className={`font-bold ${permitStats.expired > 0 ? 'text-red-600 dark:text-red-400' : 'text-stone-400 dark:text-stone-500'}`}>
                      {permitStats.expired} Stays
                    </span>
                  </div>
                </div>

                {/* Actionable List if any permits require renewal */}
                {permitStats.actionList.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-stone-100 dark:border-white/5">
                    <p className="text-[10px] font-bold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                      Requires Renewal ({permitStats.actionList.length})
                    </p>
                    <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                      {permitStats.actionList.map(p => {
                        const isExpired = new Date(p.permit_expires_on) < new Date()
                        return (
                          <Link 
                            key={p.id} 
                            to={`/admin/property/${p.id}`}
                            className="flex items-center justify-between p-2 rounded-lg bg-stone-50/80 dark:bg-white/5 hover:bg-stone-100 dark:hover:bg-white/10 transition-colors group"
                          >
                            <div className="min-w-0 pr-2">
                              <p className="text-xs font-bold text-stone-800 dark:text-stone-200 truncate group-hover:text-teal-600 transition-colors">
                                {p.name}
                              </p>
                              <p className={`text-[10px] font-semibold ${isExpired ? 'text-red-500' : 'text-amber-500'}`}>
                                {isExpired ? 'Expired: ' : 'Expires: '}{new Date(p.permit_expires_on).toLocaleDateString()}
                              </p>
                            </div>
                            <span className="text-xs text-stone-400 group-hover:text-teal-600 group-hover:translate-x-0.5 transition-all">→</span>
                          </Link>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-100 dark:border-white/5 flex items-center justify-between text-[11px]">
                <span className="text-stone-400 dark:text-stone-500">Provincial Standard</span>
                <span className="font-bold text-stone-700 dark:text-stone-300">Batanes LGU Verified</span>
              </div>
            </Card>
          </div>

        </div>
    </div>
  )
}
