import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { Home, Users, BedDouble, FileText, Plus, CheckCircle, XCircle } from 'lucide-react'

export default function HomeownerDashboard() {
  const { user, loading } = useAuthStore((s) => ({ user: s.user, loading: s.isLoading }))
  const updateReservationStatus = useAuthStore((s) => s.updateReservationStatus)
  const [stats, setStats] = useState({ properties: 0, rooms: 0, occupied: 0, vacant: 0, pending: 0, approved: 0 })
  const [recent, setRecent] = useState([])
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
      alert(err.message || 'Failed to update reservation.')
    }).finally(function() {
      setActioningId(null)
    })
  }

  if (loading) return <div className="p-12 text-center text-stone-400">Loading dashboard…</div>

  return (
    <div className="page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-5">
        <div>
          <p className="font-bold text-2xl text-stone-800">Homeowner Dashboard</p>
          <p className="text-sm text-stone-400 mt-0.5">Manage your properties</p>
        </div>
        <Link to="/owner/properties"><Button><Plus size={16} /> Add Property</Button></Link>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Total Properties</p>
            <p className="font-bold text-2xl sm:text-3xl" style={{ color: '#0F6E56' }}>{stats.properties}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Total Rooms</p>
            <p className="font-bold text-2xl sm:text-3xl" style={{ color: '#534AB7' }}>{stats.rooms}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Occupied</p>
            <p className="font-bold text-2xl sm:text-3xl" style={{ color: '#BA7517' }}>{stats.occupied}</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Vacant</p>
            <p className="font-bold text-2xl sm:text-3xl" style={{ color: '#1D9E75' }}>{stats.vacant}</p>
          </Card>
        </div>

        <Card className="overflow-hidden">
          <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-b border-stone-100">
            <h3 className="font-semibold text-[13px] sm:text-[14px] text-stone-800 uppercase tracking-wide">Recent Requests</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[400px] sm:min-w-0 divide-y divide-stone-200">
              <thead>
                <tr className="bg-stone-50">
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-[8px] sm:text-[10px] font-bold text-stone-500 uppercase">Tenant</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-[8px] sm:text-[10px] font-bold text-stone-500 uppercase">Property</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-[8px] sm:text-[10px] font-bold text-stone-500 uppercase">Status</th>
                  <th className="px-3 py-2 sm:px-4 sm:py-3 text-left text-[8px] sm:text-[10px] font-bold text-stone-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {recent.map(function(r) {
                  return (
                    <tr key={r.id} className="hover:bg-stone-50">
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-sm font-medium text-stone-800 truncate max-w-[80px] sm:max-w-none">Tenant {r.tenant_id ? r.tenant_id.substring(0, 6) : ''}</td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-[11px] sm:text-sm text-stone-600 truncate max-w-[80px] sm:max-w-none">{r.property_id ? r.property_id.substring(0, 8) : '-'}</td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3"><Badge variant={r.status === 'confirmed' || r.status === 'approved' ? 'teal' : r.status === 'pending' ? 'amber' : 'gray'} className="text-[9px] sm:text-[11px]">{r.status}</Badge></td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        {r.status === 'pending' ? (
                          <div className="flex gap-1 sm:gap-2">
                            <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto" variant="primary" disabled={actioningId === r.id} onClick={function() { handleStatusChange(r.id, 'confirmed') }}>
                              <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Appr
                            </Button>
                            <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto" variant="ghost" disabled={actioningId === r.id} onClick={function() { handleStatusChange(r.id, 'cancelled') }}>
                              <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Rej
                            </Button>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
                {recent.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-xs sm:text-sm text-stone-400">No recent reservations</td></tr>}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  )
}
