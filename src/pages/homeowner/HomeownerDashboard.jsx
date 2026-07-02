import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Home, Users, BedDouble, FileText, Plus, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'

export default function HomeownerDashboard() {
  const { user, loading } = useAuthStore((s) => ({ user: s.user, loading: s.isLoading }))
  const updateReservationStatus = useAuthStore((s) => s.updateReservationStatus)
  const addToast = useAppStore((s) => s.addToast)
  const [stats, setStats] = useState({ properties: 0, rooms: 0, occupied: 0, vacant: 0, pending: 0, approved: 0 })
  const [recent, setRecent] = useState([])
  const [expiringPermits, setExpiringPermits] = useState([])
  const [actioningId, setActioningId] = useState(null)
  const wasHiddenRef = useRef(false)

  const loadData = useCallback(function() {
    if (!user?.id || loading) return
    Promise.all([
      useAuthStore.getState().fetchProperties({ ownerId: user.id }),
      useAuthStore.getState().fetchReservations(),
    ]).then(function(results) {
      var houses = results[0] || []
      var activeHouses = houses.filter(function(h) { return h.status !== 'pending_review' })
      
      var now = new Date()
      var thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      
      var expiring = activeHouses.filter(function(h) {
        if (!h.permit_expires_on) return false
        var expDate = new Date(h.permit_expires_on)
        return expDate <= thirtyDays
      })
      setExpiringPermits(expiring)

      var reservations = results[1] || []
      var myPropIds = houses.map(function(h) { return h.id })
      var myReservations = reservations.filter(function(r) { return myPropIds.indexOf(r.property_id) !== -1 })
      setStats({
        properties: activeHouses.length,
        rooms: activeHouses.reduce(function(sum, h) { return sum + (h.total_rooms || 0) }, 0),
        occupied: activeHouses.reduce(function(sum, h) { return sum + ((h.total_rooms || 0) - (h.available_rooms || 0)) }, 0),
        vacant: activeHouses.reduce(function(sum, h) { return sum + (h.available_rooms || 0) }, 0),
        pending: myReservations.filter(function(r) { return r.status === 'pending' }).length,
        approved: myReservations.filter(function(r) { return r.status === 'confirmed' || r.status === 'approved' }).length,
      })
      setRecent(myReservations.slice(0, 5))
    })
  }, [user, loading])

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

  function handleStatusChange(id, status) {
    setActioningId(id)
    updateReservationStatus(id, status).then(function() {
      loadData()
    }).catch(function(err) {
      console.error('Status update failed:', err)
      addToast(err.message || 'Failed to update reservation.', 'error')
    }).finally(function() {
      setActioningId(null)
    })
  }

  if (loading) return <div className="p-12 text-center text-stone-400">Loading dashboard…</div>

  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-5">
        <div>
          <p className="font-bold text-lg md:text-xl text-stone-800">Homeowner Dashboard</p>
          <p className="text-sm text-stone-400 mt-0.5">Manage your properties</p>
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Link to="/owner/properties"><Button><Plus size={16} /> Add Property</Button></Link>
        </div>
      </div>

      <div className="p-6 space-y-5">
        {expiringPermits.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-xl flex-shrink-0">
                <AlertTriangle size={20} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-amber-900 text-sm sm:text-base mb-1">Business Permits Expiring Soon!</h3>
                <p className="text-amber-700 text-xs sm:text-sm mb-3">
                  The following properties have business permits that are expiring within 30 days or have already expired. Please renew them to avoid delisting.
                </p>
                <div className="flex flex-col gap-2">
                  {expiringPermits.map(p => {
                    const exp = new Date(p.permit_expires_on)
                    const isExpired = exp < new Date()
                    return (
                      <div key={p.id} className="flex flex-col sm:flex-row sm:items-center justify-between bg-white/60 p-2.5 sm:p-3 rounded-xl border border-amber-100 gap-3">
                        <div>
                          <p className="font-semibold text-stone-800 text-xs sm:text-sm">{p.name}</p>
                          <p className={`text-[10px] sm:text-xs font-medium ${isExpired ? 'text-red-600' : 'text-amber-600'}`}>
                            {isExpired ? 'Expired on: ' : 'Expires: '} {exp.toLocaleDateString()}
                          </p>
                        </div>
                        <Link to={`/owner/properties/edit/${p.id}`}>
                          <Button size="sm" variant={isExpired ? 'danger' : 'primary'} className="w-full sm:w-auto text-xs py-1.5 px-3 h-auto">
                            Renew Permit
                          </Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Total Properties</p>
            <p className="font-bold text-xl sm:text-2xl" style={{ color: '#0F6E56' }}>{stats.properties}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Total Rooms</p>
            <p className="font-bold text-xl sm:text-2xl" style={{ color: '#534AB7' }}>{stats.rooms}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Occupied</p>
            <p className="font-bold text-xl sm:text-2xl" style={{ color: '#BA7517' }}>{stats.occupied}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Vacant</p>
            <p className="font-bold text-xl sm:text-2xl" style={{ color: '#1D9E75' }}>{stats.vacant}</p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-stone-100">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-[13px] sm:text-[14px] text-stone-800 uppercase tracking-wide">Recent Requests</h3>
              <Link to="/owner/reservations">
                <Button variant="ghost" size="sm" className="px-2 sm:px-3 py-1 text-[10px] sm:text-xs">Manage All →</Button>
              </Link>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] sm:min-w-0 divide-y divide-stone-200">
              <thead>
                <tr className="bg-stone-50">
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-[8px] sm:text-[10px] font-bold text-stone-500 uppercase">Tenant</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-[8px] sm:text-[10px] font-bold text-stone-500 uppercase">Property</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-[8px] sm:text-[10px] font-bold text-stone-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recent.map(function(r) {
                  return (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-sm font-medium text-stone-800 truncate max-w-[80px] sm:max-w-none">{r.tenant_name || (r.tenant_id ? r.tenant_id.substring(0, 8) : 'Unknown')}</td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-sm text-stone-600 truncate max-w-[80px] sm:max-w-none">{r.property_name || (r.property_id ? r.property_id.substring(0, 8) : '-')}</td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3"><Badge variant={r.status === 'confirmed' || r.status === 'approved' ? 'teal' : r.status === 'pending' ? 'amber' : 'gray'} className="text-[9px] sm:text-[11px]">{r.status}</Badge></td>
                    </tr>
                  )
                })}
                {recent.length === 0 && <tr><td colSpan={3} className="px-4 py-8 text-center text-xs sm:text-sm text-stone-400">No recent reservations</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
