import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { Plus, Download, Calendar, Star, TrendingUp, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function TenantDashboard() {
  const { user, loading } = useAuthStore((s) => ({ user: s.user, loading: s.isLoading }))
  const [stats, setStats] = useState({ reservations: 0, favorites: 0, recommended: [] })
  const [recentActivity, setRecentActivity] = useState([])

  var loadData = useCallback(function() {
    if (!user?.id) return
    Promise.all([
      useAuthStore.getState().fetchReservations({ tenantId: user.id }),
      useAuthStore.getState().fetchProperties({ status: 'active' }),
    ]).then(function(results) {
      setStats({
        reservations: results[0].length,
        favorites: 0,
        recommended: results[1].slice(0, 4),
      })
      setRecentActivity(results[0].slice(0, 5))
    })
  }, [user?.id])

  useFocusRefresh(loadData, [user?.id])

  if (loading) return <div className="p-12 text-center text-stone-400">Loading dashboard…</div>

  function greeting() {
    var hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 18) return 'Good afternoon'
    return 'Good evening'
  }

  return (
    <div className="page-enter">
      <div className="px-6 pt-5 pb-1">
        <p className="font-bold text-2xl text-stone-800">{greeting()}, {user?.name ? user.name.split(' ')[0] : 'User'} 👋</p>
        <p className="text-sm text-stone-400 mt-0.5">Here's what's happening with your stays</p>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-4 gap-4">
          <Card className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">Active Reservations</p>
            <p className="font-bold text-3xl" style={{ color: '#0F6E56' }}>{stats.reservations}</p>
            <p className="text-[11px] text-stone-400 mt-1">View your bookings</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">Saved Properties</p>
            <p className="font-bold text-3xl" style={{ color: '#BA7517' }}>{stats.favorites}</p>
            <p className="text-[11px] text-stone-400 mt-1">Favorite listings</p>
          </Card>
          <Card className="p-4">
            <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1">Recommended</p>
            <p className="font-bold text-3xl" style={{ color: '#1D9E75' }}>{stats.recommended.length}</p>
            <p className="text-[11px] text-stone-400 mt-1">For you</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card>
            <div className="p-4 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800">Recent Activity</h3>
            </div>
            <div className="p-4 space-y-3">
              {recentActivity.map(function(a) {
                return (
                  <div key={a.id} className="flex items-center gap-2.5 py-2 border-b border-stone-50 last:border-0">
                    <div className="w-7 h-7 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[10px] font-semibold text-[#0F6E56]">
                      {(a.property_id || '??').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12px] font-medium text-stone-800 truncate">Reservation</p>
                      <p className="text-[10px] text-stone-400 truncate">{a.property_id ? a.property_id.substring(0, 8) : '—'}</p>
                    </div>
                    <Badge variant={a.status === 'pending' ? 'amber' : a.status === 'confirmed' ? 'teal' : 'gray'}>{a.status}</Badge>
                  </div>
                )
              })}
              {recentActivity.length === 0 && <p className="text-sm text-stone-400 text-center py-8">No recent activity</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
