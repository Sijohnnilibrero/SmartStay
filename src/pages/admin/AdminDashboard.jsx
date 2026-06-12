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
      useAuthStore.getState().fetchTenants(),
      useAuthStore.getState().fetchProperties(),
      useAuthStore.getState().fetchReservations(),
    ]).then(function(results) {
      var tenants = results[0] || []
      var properties = results[1] || []
      var reservations = results[2] || []
      setStats([
        { label: 'Total Tenants', value: tenants.length, icon: Users, color: 'blue' },
        { label: 'Total Homeowners', value: tenants.filter(function(t) { return t.role === 'homeowner' }).length, icon: Home, color: 'purple' },
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
        <div className="grid grid-cols-4 gap-4">
          {stats.map(function(s) {
            return (
              <Card key={s.label} className="p-4">
                <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">{s.label}</p>
                <p className="font-bold text-3xl" style={{ color: s.color === 'blue' ? '#534AB7' : s.color === 'purple' ? '#534AB7' : s.color === 'emerald' ? '#1D9E75' : s.color === 'amber' ? '#BA7517' : '#D85A30' }}>{s.value}</p>
              </Card>
            )
          })}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <Card className="col-span-2">
            <div className="p-4 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800 uppercase tracking-wide">Recent Activity</h3>
              <Link to="/admin/reservations"><Button variant="ghost" size="sm">View all</Button></Link>
            </div>
            <div className="divide-y divide-stone-100">
              {recent.map(function(r) {
                return (
                  <div key={r.id} className="px-4 py-3.5 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-stone-800">Reservation: <span className="font-semibold">Tenant</span> → <span className="font-semibold">Property</span></p>
                      <p className="text-xs text-stone-400 mt-0.5">{new Date(r.created_at).toLocaleString()}</p>
                    </div>
                    <Badge variant={r.status === 'approved' || r.status === 'confirmed' ? 'teal' : r.status === 'pending' ? 'amber' : 'gray'}>{r.status}</Badge>
                  </div>
                )
              })}
              {recent.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No recent activity</p>}
            </div>
          </Card>

          <div className="space-y-4">
            <p className="font-medium text-stone-800 uppercase tracking-wide">Quick Links</p>
            <div className="bg-white rounded-xl border border-stone-200 divide-y divide-stone-100">
              {[
                { label: 'Manage Users', desc: 'Approve, suspend, or change roles', to: '/admin/users' },
                { label: 'Review Properties', desc: 'Approve pending listings', to: '/admin/properties' },
                { label: 'View Analytics', desc: 'Reports and insights', to: '/admin/analytics' },
              ].map(function(l) {
                return (
                  <Link key={l.to} to={l.to} className="block p-4 hover:bg-stone-50 transition-colors">
                    <p className="text-sm font-semibold text-stone-800">{l.label}</p>
                    <p className="text-xs text-stone-400 mt-0.5">{l.desc}</p>
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
