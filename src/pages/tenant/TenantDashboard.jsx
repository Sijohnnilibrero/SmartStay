import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { Plus, Download, Calendar, Star, TrendingUp, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

var BUDGETS = [
  { value: '1k-2k', label: '₱1,000–₱2,000', min: 1000, max: 2000 },
  { value: '2k-3.5k', label: '₱2,000–₱3,500', min: 2000, max: 3500 },
  { value: '3.5k+', label: '₱3,500+', min: 3500, max: 99999 },
]

function scoreProperty(p, opts) {
  var score = 0
  var budget = opts.budget
  var municipality = opts.municipality
  var amenityPrefs = opts.amenityPrefs

  if (p.price_monthly >= budget.min && p.price_monthly <= budget.max) score += 30
  if (municipality === 'Any' || p.municipality === municipality) score += 25
  score += Math.round(((p.rating || 0) / 5) * 20)
  amenityPrefs.forEach(function(pref) {
    if ((p.amenities || []).indexOf(pref) !== -1) score += 5
  })
  if ((p.available_rooms || 0) > 0) score += 10
  return Math.min(score, 100)
}

export default function TenantDashboard() {
  const { user, loading } = useAuthStore((s) => ({ user: s.user, loading: s.isLoading }))
  const [stats, setStats] = useState({ reservations: 0, favorites: 0, recommendedCount: 0 })
  const [recentActivity, setRecentActivity] = useState([])

  var loadData = useCallback(function() {
    if (!user?.id) return
    Promise.all([
      useAuthStore.getState().fetchReservations({ tenantId: user.id }),
      useAuthStore.getState().fetchProperties({ status: 'active' }),
    ]).then(function(results) {
      var allProps = results[1] || []
      var recommendedCount = 0
      
      if (user?.preferences) {
        var budgetVal = user.preferences.budget || '2k-3.5k'
        var budgetObj = BUDGETS.find(function(b) { return b.value === budgetVal }) || BUDGETS[1]
        var opts = {
          budget: budgetObj,
          municipality: user.preferences.municipality || 'Any',
          amenityPrefs: user.preferences.amenityPrefs || []
        }
        recommendedCount = allProps
          .map(function(p) { return scoreProperty(p, opts) })
          .filter(function(score) { return score >= 50 }).length
      } else {
        recommendedCount = allProps.slice(0, 4).length
      }

      setStats({
        reservations: results[0].length,
        favorites: 0,
        recommendedCount: recommendedCount,
      })
      setRecentActivity(results[0].slice(0, 5))
    })
  }, [user])

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
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Active Reservations</p>
            <p className="font-bold text-2xl sm:text-3xl" style={{ color: '#0F6E56' }}>{stats.reservations}</p>
            <p className="text-[9px] sm:text-[11px] text-stone-400 mt-0.5 sm:mt-1 truncate">View your bookings</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Saved Properties</p>
            <p className="font-bold text-2xl sm:text-3xl" style={{ color: '#BA7517' }}>{stats.favorites}</p>
            <p className="text-[9px] sm:text-[11px] text-stone-400 mt-0.5 sm:mt-1 truncate">Favorite listings</p>
          </Card>
          <Card className="p-3 sm:p-4">
            <p className="text-[9px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Recommended</p>
            <p className="font-bold text-2xl sm:text-3xl" style={{ color: '#1D9E75' }}>{stats.recommendedCount}</p>
            <p className="text-[9px] sm:text-[11px] text-stone-400 mt-0.5 sm:mt-1 truncate">For you</p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <Card className="p-0 overflow-hidden">
            <div className="p-3 sm:p-4 border-b border-stone-100">
              <h3 className="font-semibold text-[13px] sm:text-base text-stone-800">Recent Activity</h3>
            </div>
            <div className="p-3 sm:p-4 space-y-2 sm:space-y-3">
              {recentActivity.map(function(a) {
                return (
                  <div key={a.id} className="flex items-center gap-2 sm:gap-2.5 py-1.5 sm:py-2 border-b border-stone-50 last:border-0">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[9px] sm:text-[10px] font-semibold text-[#0F6E56]">
                      {(a.property_id || '??').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-[12px] font-medium text-stone-800 truncate">Reservation</p>
                      <p className="text-[9px] sm:text-[10px] text-stone-400 truncate">{a.property_id ? a.property_id.substring(0, 8) : '—'}</p>
                    </div>
                    <Badge variant={a.status === 'pending' ? 'amber' : a.status === 'confirmed' ? 'teal' : 'gray'} className="text-[9px] sm:text-[11px]">
                      {a.status}
                    </Badge>
                  </div>
                )
              })}
              {recentActivity.length === 0 && <p className="text-xs sm:text-sm text-stone-400 text-center py-6 sm:py-8">No recent activity</p>}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
