import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { formatCurrency, calculateNextDueDate } from '@/lib/utils'
import NotificationBell from '@/components/layout/NotificationBell'

export default function TenantDashboard() {
  const { user, loading } = useAuthStore((s) => ({ user: s.user, loading: s.isLoading }))
  const [recentActivity, setRecentActivity] = useState([])
  const [landlordData, setLandlordData] = useState(null)
  const [transactions, setTransactions] = useState([])

  var loadData = useCallback(function() {
    if (!user?.id) return
    Promise.all([
      useAuthStore.getState().fetchReservations({ tenantId: user.id }),
      useAuthStore.getState().fetchMyLandlord(user.id),
      useAuthStore.getState().fetchTransactions()
    ]).then(function(results) {
      setRecentActivity(results[0].slice(0, 5))
      setLandlordData(results[1])
      setTransactions(results[2])
    }).catch(function(err) {
      console.error(err)
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

  function getExpirationDate(res) {
    if (!res || !res.check_in || !res.duration_months) return 'No active contract'
    var d = new Date(res.check_in)
    d.setMonth(d.getMonth() + res.duration_months)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  var dueData = landlordData?.reservation ? calculateNextDueDate(landlordData.reservation, transactions) : null

  return (
    <div className="page-enter">
      <div className="px-6 pt-5 pb-1 flex items-start justify-between">
        <div>
          <p className="font-bold text-lg md:text-xl text-stone-800">{greeting()}, {user?.name ? user.name.split(' ')[0] : 'User'} 👋</p>
          <p className="text-sm text-stone-400 mt-0.5">Here's what's happening with your stays</p>
        </div>
        <NotificationBell />
      </div>
      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <Card className="p-4 sm:p-5 border-l-4" style={{ borderLeftColor: '#0F6E56' }}>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-1 truncate">My Landlord</p>
            <p className="font-bold text-lg sm:text-xl text-stone-800 truncate mb-1">
              {landlordData?.landlord?.full_name || 'N/A'}
            </p>
            <p className="text-[12px] text-stone-500 truncate">
              {landlordData?.landlord ? (landlordData.landlord.contact || 'No contact info provided') : 'No active landlord'}
            </p>
          </Card>
          <Card className="p-4 sm:p-5 border-l-4" style={{ borderLeftColor: '#BA7517' }}>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-1 truncate">My Contract</p>
            <p className="font-bold text-lg sm:text-xl text-stone-800 truncate mb-1">
              {landlordData?.property?.name || 'N/A'}
            </p>
            <p className="text-[12px] text-stone-500 truncate">
              {landlordData?.property && landlordData?.reservation ? formatCurrency(landlordData.reservation.amount_total / landlordData.reservation.duration_months) + ' / mo' : 'No active contract'}
            </p>
          </Card>
          <Card className="p-4 sm:p-5 border-l-4" style={{ borderLeftColor: '#1D9E75' }}>
            <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-1 truncate">Contract Expiration</p>
            <p className="font-bold text-lg sm:text-xl text-stone-800 truncate mb-1">
              {getExpirationDate(landlordData?.reservation)}
            </p>
            <p className="text-[12px] text-stone-500 truncate">
              {landlordData?.reservation ? landlordData.reservation.duration_months + ' months total' : 'No active contract'}
            </p>
          </Card>
        </div>

        {dueData && (dueData.isOverdue || dueData.isUpcoming) && (
          <div className={`p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3 ${dueData.isOverdue ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
            <div className={`p-2 rounded-full ${dueData.isOverdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div>
              <h4 className={`font-bold text-sm ${dueData.isOverdue ? 'text-red-800' : 'text-orange-800'}`}>
                {dueData.isOverdue ? 'Rent is Overdue' : 'Rent is Due Soon'}
              </h4>
              <p className={`text-xs mt-1 ${dueData.isOverdue ? 'text-red-700' : 'text-orange-700'}`}>
                Your monthly rent is <strong>{formatCurrency(landlordData.reservation.amount_total / landlordData.reservation.duration_months)}</strong>. 
                You have verified payments of {formatCurrency((landlordData.reservation.amount_total / landlordData.reservation.duration_months) - dueData.amountDue)} for this billing cycle.
                <br />
                Please log a payment for your remaining balance of <strong>{formatCurrency(dueData.amountDue)}</strong> {dueData.isOverdue ? 'as soon as possible.' : `by ${dueData.dateString}.`}
              </p>
              <Link to="/tenant/payments" className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg ${dueData.isOverdue ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'} transition-colors`}>
                Pay Remaining Balance &rarr;
              </Link>
            </div>
          </div>
        )}

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
                      {(a.property_name || a.property_id || '??').substring(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] sm:text-[12px] font-medium text-stone-800 truncate">Reservation: {a.property_name || 'Property'}</p>
                      <p className="text-[9px] sm:text-[10px] text-stone-400 truncate">{new Date(a.created_at).toLocaleDateString()}</p>
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
