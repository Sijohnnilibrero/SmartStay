import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { Users, Home, Calendar, Shield, AlertTriangle, TrendingUp } from 'lucide-react'

export default function AdminDashboard() {
  const [stats, setStats] = useState([])
  const [recent, setRecent] = useState([])
  const wasHiddenRef = useRef(false)

  const loadData = useCallback(function() {
    Promise.all([
      useAuthStore.getState().fetchAllUsers(),
      useAuthStore.getState().fetchProperties(),
      useAuthStore.getState().fetchReservations(),
    ]).then(function(results) {
      var users = results[0] || []
      var properties = results[1] || []
      var reservations = results[2] || []
      setStats([
        { label: 'Total Tenants', value: users.filter(function(u) { return u.role === 'tenant' }).length, icon: Users, color: 'blue' },
        { label: 'Total Homeowners', value: users.filter(function(u) { return u.role === 'owner' }).length, icon: Home, color: 'purple' },
        { label: 'Total Properties', value: properties.length, icon: Home, color: 'emerald' },
        { label: 'Total Reservations', value: reservations.length, icon: Calendar, color: 'amber' },
        { label: 'Pending Approvals', value: properties.filter(function(p) { return p.status === 'pending_review' }).length, icon: Shield, color: 'amber' },
        { label: 'Open Complaints', value: 0, icon: AlertTriangle, color: 'rose' },
      ])
      setRecent(reservations.slice(0, 5))
    })
  }, [])

  useEffect(function() { loadData() }, [loadData])

  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadData()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function() { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadData])

  return (
    <div className="page-enter">
      <div className="px-6 pt-5 pb-1">
        <p className="font-bold text-2xl text-stone-800">Admin Dashboard</p>
        <p className="text-sm text-stone-400 mt-0.5">Platform overview and quick actions</p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          {stats.map(function(s) {
            return (
              <Card key={s.label} className="p-3 sm:p-4 flex flex-col justify-between">
                <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">{s.label}</p>
                <p className="font-bold text-2xl sm:text-3xl" style={{ color: s.color === 'blue' ? '#534AB7' : s.color === 'purple' ? '#534AB7' : s.color === 'emerald' ? '#1D9E75' : s.color === 'amber' ? '#BA7517' : '#D85A30' }}>{s.value}</p>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-4">
          <Card className="lg:col-span-2 p-0 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-[13px] sm:text-base text-stone-800 uppercase tracking-wide">Recent Activity</h3>
              <Link to="/admin/reservations"><Button variant="ghost" size="sm" className="px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-sm">View all</Button></Link>
            </div>
            <div className="divide-y divide-stone-100 p-2 sm:p-0">
              {recent.map(function(r) {
                return (
                  <div key={r.id} className="px-2 py-2 sm:px-4 sm:py-3.5 flex items-center justify-between">
                    <div className="min-w-0 flex-1 pr-2">
                      <p className="text-[11px] sm:text-sm font-medium text-stone-800 truncate">Res: <span className="font-semibold">{r.tenant_name || 'Tenant'}</span> → <span className="font-semibold">{r.property_name || 'Property'}</span></p>
                      <p className="text-[9px] sm:text-xs text-stone-400 mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={r.status === 'approved' || r.status === 'confirmed' ? 'teal' : r.status === 'pending' ? 'amber' : 'gray'} className="text-[9px] sm:text-[11px] flex-shrink-0">{r.status}</Badge>
                  </div>
                )
              })}
              {recent.length === 0 && <p className="text-xs sm:text-sm text-stone-400 text-center py-6 sm:py-8">No recent activity</p>}
            </div>
          </Card>

          <div className="space-y-3 sm:space-y-4">
            <p className="font-medium text-[12px] sm:text-[14px] text-stone-800 uppercase tracking-wide px-1 sm:px-0">Quick Links</p>
            <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
              {[
                { label: 'Manage Users', desc: 'Approve, suspend, or change roles', to: '/admin/users' },
                { label: 'Review Properties', desc: 'Approve pending listings', to: '/admin/properties' },
                { label: 'View Analytics', desc: 'Reports and insights', to: '/admin/analytics' },
              ].map(function(l) {
                return (
                  <Link key={l.to} to={l.to} className="block p-3 sm:p-4 hover:bg-stone-50 transition-colors">
                    <p className="text-[12px] sm:text-sm font-semibold text-stone-800">{l.label}</p>
                    <p className="text-[10px] sm:text-xs text-stone-400 mt-0.5">{l.desc}</p>
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
