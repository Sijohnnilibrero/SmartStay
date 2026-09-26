import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { Users, Home, Calendar, Shield, AlertTriangle, TrendingUp, BedDouble, MapPin, DollarSign, Headphones } from 'lucide-react'
import ThemeToggle from '@/components/layout/ThemeToggle'
import NotificationBell from '@/components/layout/NotificationBell'
import PropertyMap from '@/components/map/PropertyMap'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { formatCurrency } from '@/lib/utils'

const MUNICIPALITIES = ['Basco', 'Mahatao', 'Ivana', 'Uyugan', 'Sabtang', 'Itbayat']
const COLORS = ['#1D9E75', '#534AB7', '#BA7517', '#D85A30', '#0F6E56', '#7C3AED']

export default function AdminDashboard() {
  const [stats, setStats] = useState([])
  const [recent, setRecent] = useState([])
  const [expiringPermits, setExpiringPermits] = useState([])
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

      setStats([
        { label: 'Total Tenants', value: users.filter(function(u) { return u.role === 'tenant' }).length, icon: Users, color: 'blue' },
        { label: 'Total Homeowners', value: users.filter(function(u) { return u.role === 'owner' }).length, icon: Home, color: 'purple' },
        { label: 'Total Properties', value: properties.length, icon: Home, color: 'emerald' },
        { label: 'Pending Approvals', value: properties.filter(function(p) { return p.status === 'pending_review' }).length, icon: Shield, color: 'amber' },
      ])
      
      const pendingProps = properties.filter(p => p.status === 'pending_review')
      setRecent(pendingProps.slice(0, 5))

      var now = new Date()
      var thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      var expiring = properties.filter(function(p) {
        if (!p.permit_expires_on || p.status === 'inactive') return false
        return new Date(p.permit_expires_on) <= thirtyDays
      })
      setExpiringPermits(expiring)

      setActiveProperties(properties.filter(p => p.status === 'approved' || p.status === 'active'))

      if (!silent) setLoading(false)
    })
  }, [])

  useEffect(function() { loadData() }, [loadData])

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
  let totalRooms = 0
  let availableRooms = 0
  
  activeProperties.forEach(p => {
    totalRooms += (p.total_rooms || 0)
    availableRooms += (p.available_rooms || 0)
  })
  let occupiedRooms = totalRooms - availableRooms

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

  const totalActiveProps = activeProperties.length

  const muniStats = scopedMunicipalities.map(m => {
    const props = activeProperties.filter(p => p.municipality === m.name)
    const count = props.length
    const rooms = props.reduce((sum, p) => sum + (p.total_rooms || 0), 0)
    const avail = props.reduce((sum, p) => sum + (p.available_rooms || 0), 0)
    const share = totalActiveProps > 0 ? Math.round((count / totalActiveProps) * 100) : 0
    return {
      ...m,
      count,
      rooms,
      avail,
      share
    }
  })

  const activeMuniCount = muniStats.filter(m => m.count > 0).length

  const vacancyData = [
    { name: 'Available', value: availableRooms, color: '#1D9E75' },
    { name: 'Occupied', value: occupiedRooms, color: '#534AB7' },
  ]

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

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-[#18181b] border border-stone-200 dark:border-white/10 p-3 rounded-xl shadow-xl text-stone-900 dark:text-white">
          <p className="font-bold text-sm mb-1">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} className="text-xs font-semibold" style={{ color: entry.color || '#1D9E75' }}>
              {entry.name}: {entry.name === 'Average Price' || entry.dataKey === 'averagePrice' ? formatCurrency(entry.value) : entry.value}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };


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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 select-none cursor-default">
          {stats.map(function(s) {
            const accentColor = s.color === 'blue' ? '#534AB7' : s.color === 'purple' ? '#7C3AED' : s.color === 'emerald' ? '#1D9E75' : '#BA7517'
            return (
              <Card key={s.label} className="p-4 sm:p-5 flex flex-col justify-between glass-card hover:-translate-y-1 hover:shadow-lg transition-all duration-300 border-l-4 select-none cursor-default" style={{ borderLeftColor: accentColor }}>
                <div className="flex items-center gap-2 mb-2 sm:mb-3 select-none cursor-default">
                  <s.icon size={16} style={{ color: accentColor }} />
                  <p className="text-[10px] sm:text-xs uppercase tracking-wider text-stone-500 dark:text-stone-400 font-bold truncate select-none cursor-default">{s.label}</p>
                </div>
                <p className="font-extrabold text-2xl sm:text-3xl select-none cursor-default" style={{ color: accentColor }}>{s.value}</p>
              </Card>
            )
          })}
        </div>

        {/* Row 2: Analytics & Map Widget */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 flex-1">
          
          {/* Properties per Municipality - Clean Scoped Table */}
          <Card className="p-5 sm:p-6 glass-card lg:col-span-2 hover:shadow-md transition-shadow">
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
                    <th className="py-2.5 px-3 sm:px-4 text-center">Available Rooms</th>
                    <th className="py-2.5 px-3 sm:px-4 text-right">Coverage Share</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-white/5">
                  {muniStats.map((m) => {
                    const isActive = m.count > 0
                    return (
                      <tr key={m.name} className="transition-colors" style={{ borderColor: 'var(--border-divider)' }}
                        onMouseEnter={e => e.currentTarget.style.backgroundColor = 'var(--surface-hover)'}
                        onMouseLeave={e => e.currentTarget.style.backgroundColor = ''}>
                        <td className="py-3 px-3 sm:px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: m.color }} />
                            <div>
                              <p className="font-bold text-xs sm:text-sm" style={{ color: 'var(--text-primary)' }}>{m.name}</p>
                              <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>{m.island} Island</span>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center">
                          <span className={`inline-block font-bold text-xs sm:text-sm`} style={{ color: isActive ? 'var(--text-primary)' : 'var(--text-faint)' }}>
                            {m.count}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-center">
                          {isActive ? (
                            <span className="text-xs sm:text-sm font-semibold" style={{ color: 'var(--teal)' }}>
                              {m.avail} <span style={{ color: 'var(--text-faint)', fontWeight: 400 }}>/ {m.rooms} rms</span>
                            </span>
                          ) : (
                            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 sm:px-4 text-right">
                          {isActive ? (
                            <div className="inline-flex items-center gap-1.5 justify-end">
                              <div className="w-16 sm:w-20 bg-stone-100 dark:bg-stone-700 h-2 rounded-full overflow-hidden hidden sm:block">
                                <div className="h-full rounded-full" style={{ width: `${m.share}%`, backgroundColor: m.color }} />
                              </div>
                              <span className="font-bold text-xs" style={{ color: m.color }}>{m.share}%</span>
                            </div>
                          ) : (
                            <Badge variant="gray" className="text-[9px] py-0 px-1.5">No Listings</Badge>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          {/* Mini Map Widget */}
          <Card className="p-0 overflow-hidden glass-card hover:shadow-md transition-shadow lg:col-span-1 flex flex-row min-h-[300px]">
            <div className="flex-1 relative">
              <PropertyMap
                key={mapIsland}
                mode="browse"
                properties={activeProperties}
                initialCenter={mapCenters[mapIsland]}
                height="100%"
                onSelect={(id) => navigate(`/admin/property/${id}`)}
              />
            </div>
            {/* Vertical Button Stack */}
            <div className="w-24 border-l flex flex-col p-2 gap-2 z-10" style={{ backgroundColor: 'var(--surface-bg)', borderColor: 'var(--border-default)' }}>
              <p className="text-[9px] font-bold text-stone-400 uppercase tracking-widest text-center mt-1 mb-1">Regions</p>
              {availableIslands.map(island => (
                <button
                  key={island}
                  onClick={() => setMapIsland(island)}
                  className={`w-full py-2 px-1 rounded-md text-[11px] font-bold transition-colors ${mapIsland === island ? 'bg-[#1D9E75] text-white shadow-sm' : 'text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'}`}
                >
                  {island}
                </button>
              ))}
              
              <div className="flex-1"></div>
              
              <Button variant="ghost" size="sm" className="w-full py-2 px-1 text-[10px] font-bold text-[#534AB7] bg-[#534AB7]/5 hover:bg-[#534AB7]/10" onClick={() => navigate('/admin/map')}>
                ⤢ Full Map
              </Button>
            </div>
          </Card>
        </div>

        {/* Action Items Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <Card className="lg:col-span-2 p-0 overflow-hidden glass-card">
            <div className="p-4 sm:p-5 border-b border-stone-200/50 dark:border-white/10 flex items-center justify-between bg-white/50 dark:bg-stone-800/50">
              <h3 className="font-extrabold text-[13px] sm:text-base text-stone-900 dark:text-white uppercase tracking-wide">Pending Properties</h3>
              <Link to="/admin/properties"><Button variant="ghost" size="sm" className="px-3 py-1.5 text-xs font-semibold text-[#534AB7] hover:bg-[#534AB7]/10">View all</Button></Link>
            </div>
            <div className="divide-y divide-stone-200/50 dark:divide-white/5 p-2 sm:p-0">
              {recent.map(function(r) {
                return (
                  <div key={r.id} className="px-3 py-3 sm:px-5 sm:py-4 flex items-center justify-between hover:bg-stone-50/50 dark:hover:bg-white/5 transition-colors">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[12px] sm:text-[14px] font-bold text-stone-800 dark:text-stone-200 truncate"><span className="text-stone-900 dark:text-white">{r.name}</span> in <span className="text-[#1D9E75]">{r.municipality}</span></p>
                      <p className="text-[10px] sm:text-xs text-stone-500 dark:text-stone-400 mt-1 font-medium">By {r.owner_name || 'Owner'}</p>
                    </div>
                    <Badge variant="amber" className="text-[10px] px-2 py-0.5 sm:px-2.5 sm:py-1 font-bold flex-shrink-0">Pending</Badge>
                  </div>
                )
              })}
              {recent.length === 0 && <p className="text-xs sm:text-sm text-stone-400 text-center py-8 font-medium">No pending properties to review</p>}
            </div>
          </Card>

          <div className="space-y-4 sm:space-y-6">
            {/* Vacancy Pie moved here to be part of the right column */}
            <Card className="p-5 sm:p-6 glass-card hover:shadow-md transition-shadow">
              <h3 className="font-extrabold text-stone-900 dark:text-white mb-6 flex items-center gap-2">
                <BedDouble size={18} className="text-[#534AB7]" /> System Vacancy
              </h3>
              {totalRooms > 0 ? (
                <div className="h-[200px] w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={vacancyData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {vacancyData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: 600 }} />
                    </PieChart>
                  </ResponsiveContainer>
                  {/* Center Text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pb-8">
                    <p className="text-xl font-black text-stone-900 dark:text-white">{Math.round((availableRooms / totalRooms) * 100)}%</p>
                    <p className="text-[9px] text-stone-500 dark:text-stone-400 uppercase tracking-widest font-bold mt-1">Vacant</p>
                  </div>
                </div>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-stone-400 text-sm font-medium">No room data available</div>
              )}
            </Card>

            {expiringPermits.length > 0 && (
              <Card className="p-0 overflow-hidden glass-card border border-amber-200/50 shadow-[0_4px_20px_-4px_rgba(251,191,36,0.1)]">
                <div className="bg-amber-50/80 backdrop-blur-sm px-4 py-3 flex items-center gap-2 border-b border-amber-200/50">
                  <AlertTriangle size={16} className="text-amber-600" />
                  <h3 className="font-extrabold text-[12px] sm:text-[14px] text-amber-900 uppercase tracking-wide">Expiring Permits ({expiringPermits.length})</h3>
                </div>
                <div className="divide-y divide-amber-100/30 max-h-[250px] overflow-y-auto bg-white/50">
                  {expiringPermits.map(p => {
                    const isExpired = new Date(p.permit_expires_on) < new Date()
                    return (
                      <Link key={p.id} to={`/admin/property/${p.id}`} className="block px-4 py-3 hover:bg-white/80 transition-colors">
                        <p className="text-[12px] sm:text-sm font-bold text-stone-900 truncate">{p.name}</p>
                        <p className={`text-[10px] sm:text-[11px] font-bold mt-1 ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                          {isExpired ? 'Expired: ' : 'Expires: '} {new Date(p.permit_expires_on).toLocaleDateString()}
                        </p>
                      </Link>
                    )
                  })}
                </div>
              </Card>
            )}

            <div>
              <p className="font-bold text-[12px] sm:text-[14px] text-stone-500 uppercase tracking-widest px-1 sm:px-0 mb-3">Quick Links</p>
              <div className="glass-card rounded-xl border border-stone-200/50 divide-y divide-stone-200/50 overflow-hidden">
                {[
                  { label: 'Manage Users', desc: 'Approve, suspend, or change roles', to: '/admin/users', icon: Users },
                  { label: 'Review Properties', desc: 'Approve pending listings', to: '/admin/properties', icon: Home },
                ].map(function(l) {
                  return (
                    <Link key={l.to} to={l.to} className="flex items-center gap-4 p-4 hover:bg-white/60 transition-colors">
                      <div className="w-8 h-8 rounded-full bg-[#534AB7]/10 flex items-center justify-center text-[#534AB7]">
                        <l.icon size={16} />
                      </div>
                      <div>
                        <p className="text-[12px] sm:text-[14px] font-bold text-stone-900">{l.label}</p>
                        <p className="text-[10px] sm:text-xs text-stone-500 font-medium mt-0.5">{l.desc}</p>
                      </div>
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

        </div>
    </div>
  )
}
