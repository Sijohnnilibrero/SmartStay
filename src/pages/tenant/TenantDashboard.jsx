import { useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { Card, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import ThemeToggle from '@/components/layout/ThemeToggle'
import NotificationBell from '@/components/layout/NotificationBell'
import { calculateNextDueDate, formatCurrency } from '@/lib/utils'

export default function TenantDashboard() {
  const { user, loading } = useAuthStore((s) => ({ user: s.user, loading: s.isLoading }))
  const [recentActivity, setRecentActivity] = useState([])
  const [landlordData, setLandlordData] = useState(null)
  const [roomData, setRoomData] = useState(null)
  const [transactions, setTransactions] = useState([])

  var loadData = useCallback(function() {
    if (!user?.id) return
    Promise.all([
      useAuthStore.getState().fetchReservations({ tenantId: user.id }),
      useAuthStore.getState().fetchMyLandlord(user.id),
      useAuthStore.getState().fetchTransactions(),
      useAuthStore.getState().fetchMyRoom(user.id)
    ]).then(function(results) {
      setRecentActivity(results[0].slice(0, 5))
      setLandlordData(results[1])
      setTransactions(results[2])
      setRoomData(results[3])
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
    if (!res || !res.check_in) return 'No active contract'
    if (res.stay_type === 'transient' && res.check_out) {
      return new Date(res.check_out).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    if (!res.duration_months) return 'No active contract'
    var d = new Date(res.check_in)
    d.setMonth(d.getMonth() + res.duration_months)
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  var dueData = landlordData?.reservation ? calculateNextDueDate(landlordData.reservation, transactions) : null

  return (
    <div className="page-enter p-6 space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 select-none cursor-default">
          {/* Card 1: My Landlord */}
          <Link to="/tenant/landlord" className="block">
            <Card className="p-4 sm:p-5 border-l-4 h-full flex flex-col justify-between hover:shadow-md transition-all select-none cursor-pointer" style={{ borderLeftColor: '#0F6E56' }}>
              <div>
                <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-400 mb-1 truncate select-none">My Landlord</p>
                <p className="font-bold text-lg sm:text-xl text-stone-800 truncate mb-1 select-none">
                  {landlordData?.landlord?.full_name || 'N/A'}
                </p>
              </div>
              <p className="text-[12px] text-stone-500 truncate select-none mt-2">
                📞 {landlordData?.landlord ? (landlordData.landlord.contact || 'No contact info provided') : 'No active landlord'}
              </p>
            </Card>
          </Link>

          {/* Card 2: My Contract & Lease (Combined) */}
          <Link to="/tenant/payments" className="block">
            <Card className="p-4 sm:p-5 border-l-4 h-full flex flex-col justify-between hover:shadow-md transition-all select-none cursor-pointer" style={{ borderLeftColor: '#BA7517' }}>
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-400 truncate select-none">My Contract</p>
                  {landlordData?.reservation && (
                    <span className="text-[10px] font-semibold text-[#BA7517] bg-[#FAEEDA] px-2 py-0.5 rounded-full">
                      {landlordData.reservation.stay_type === 'transient' ? 'Transient' : `${landlordData.reservation.duration_months || 1} mos`}
                    </span>
                  )}
                </div>
                <p className="font-bold text-lg sm:text-xl text-stone-800 truncate mb-1 select-none">
                  {landlordData?.property?.name || 'No active contract'}
                </p>
              </div>
              <div className="text-[12px] text-stone-500 truncate select-none mt-2 flex flex-col gap-0.5">
                <span className="font-medium text-stone-700">
                  {landlordData?.property && landlordData?.reservation 
                    ? (landlordData.reservation.stay_type === 'transient'
                        ? `${formatCurrency(roomData?.room?.price_daily || landlordData.reservation.amount_total)} / day`
                        : `${formatCurrency(landlordData.reservation.amount_total / (landlordData.reservation.duration_months || 1))} / mo`)
                    : '—'}
                </span>
                <span className="text-[11px] text-stone-400">
                  Expires: {getExpirationDate(landlordData?.reservation)}
                </span>
              </div>
            </Card>
          </Link>

          {/* Card 3: My Room & Stay */}
          <Link to="/tenant/room" className="block">
            <Card className="p-4 sm:p-5 border-l-4 h-full flex flex-col justify-between hover:shadow-md transition-all select-none cursor-pointer" style={{ borderLeftColor: '#1D9E75' }}>
              <div>
                <div className="flex items-center justify-between gap-1 mb-1">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-400 truncate select-none">My Room & Stay</p>
                  {roomData?.room && (
                    <span className="text-[10px] font-semibold text-[#0F6E56] bg-[#E1F5EE] px-2 py-0.5 rounded-full">
                      Floor {roomData.room.floor}
                    </span>
                  )}
                </div>
                <p className="font-bold text-lg sm:text-xl text-stone-800 truncate mb-1 select-none">
                  {roomData?.room ? `Room ${roomData.room.room_number}` : (landlordData?.property ? 'Room Assigned' : 'No active room')}
                </p>
              </div>
              <p className="text-[12px] text-stone-500 truncate select-none mt-2">
                🛏️ {roomData?.property ? `${roomData.property.municipality}, ${roomData.property.island} Island` : 'No room assigned'}
              </p>
            </Card>
          </Link>
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
                Your monthly rent is <strong>{formatCurrency(landlordData.reservation.amount_total / (landlordData.reservation.duration_months || 1))}</strong>. 
                You have verified payments of {formatCurrency((landlordData.reservation.amount_total / (landlordData.reservation.duration_months || 1)) - dueData.amountDue)} for this billing cycle.
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
  )
}
