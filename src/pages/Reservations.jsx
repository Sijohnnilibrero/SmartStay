import { useState, useEffect, useCallback, useRef } from 'react'
import Topbar from '@/components/layout/Topbar'
import { Card, Badge, Avatar, FilterChip, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { CheckCircle, XCircle, Trash2, Star } from 'lucide-react'
import AddReviewModal from '@/components/AddReviewModal'

var STATUSES = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled']
var STATUS_BADGE = { pending: 'amber', confirmed: 'teal', completed: 'gray', cancelled: 'coral' }

export default function Reservations() {
  var user = useAuthStore(function (s) { return s.user })
  var isAdmin = useAuthStore(function (s) { return s.isAdmin() })
  var isOwner = useAuthStore(function (s) { return s.isOwner() })
  var isTenant = useAuthStore(function (s) { return s.isTenant() })
  var fetchReservations = useAuthStore(function (s) { return s.fetchReservations })
  var updateReservationStatus = useAuthStore(function (s) { return s.updateReservationStatus })
  var deleteReservation = useAuthStore(function (s) { return s.deleteReservation })
  var fetchProperties = useAuthStore(function (s) { return s.fetchProperties })

  var filterState = useState('All')
  var filter = filterState[0], setFilter = filterState[1]
  var reservationsState = useState([])
  var reservations = reservationsState[0], setReservations = reservationsState[1]
  var propsState = useState([])
  var props = propsState[0], setProps = propsState[1]
  var loadingState = useState(true)
  var loading = loadingState[0], setLoading = loadingState[1]
  var actioningState = useState(null)
  var actioning = actioningState[0], setActioning = actioningState[1]
  var wasHiddenRef = useRef(false)
  
  var reviewModalState = useState({ isOpen: false, propertyId: null, propertyName: '' })
  var reviewModal = reviewModalState[0], setReviewModal = reviewModalState[1]

  var loadReservations = useCallback(function () {
    setLoading(true)
    Promise.all([
      fetchReservations(),
      fetchProperties(),
    ]).then(function (results) {
      var all = results[0] || []
      setProps(results[1] || [])
      var data = all

      if (isOwner && !isAdmin) {
        var myPropIds = (results[1] || []).filter(function (p) { return p.owner_id === user.id }).map(function (p) { return p.id })
        data = all.filter(function (r) { return myPropIds.indexOf(r.property_id) !== -1 })
      } else if (!isAdmin) {
        data = all.filter(function (r) { return r.tenant_id === user.id })
      }

      setReservations(data)
      setLoading(false)
    }).catch(function (err) {
      console.error('Failed to load reservations:', err)
      setLoading(false)
    })
  }, [isAdmin, isOwner, user?.id, fetchReservations, fetchProperties])

  useEffect(function () { loadReservations() }, [loadReservations])

  useEffect(function () {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadReservations()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function () { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadReservations])

  function handleStatus(id, status) {
    var actionText = status === 'confirmed' ? 'approve' : status === 'cancelled' ? 'reject/cancel' : status;
    if (!confirm('Are you sure you want to ' + actionText + ' this reservation?')) return;

    setActioning(id)
    updateReservationStatus(id, status).then(function () {
      setReservations(function (prev) {
        return prev.map(function (r) {
          return r.id === id ? Object.assign({}, r, { status: status }) : r
        })
      })
    }).catch(function (err) {
      console.error('Status update failed:', err)
    }).finally(function () {
      setActioning(null)
    })
  }

  function handleDelete(id) {
    if (!confirm('Delete this reservation?')) return
    setActioning(id)
    deleteReservation(id).then(function () {
      setReservations(function (prev) {
        return prev.filter(function (r) { return r.id !== id })
      })
    }).catch(function (err) {
      console.error('Delete failed:', err)
    }).finally(function () {
      setActioning(null)
    })
  }

  function getPropName(pid) {
    var p = props.find(function (x) { return x.id === pid })
    return p ? p.name : (pid ? pid.substring(0, 8) : '—')
  }

  var list = reservations.filter(function (r) {
    return filter === 'All' || r.status === filter.toLowerCase()
  })

  var totals = {
    All: reservations.length,
    Pending: reservations.filter(function (r) { return r.status === 'pending' }).length,
    Confirmed: reservations.filter(function (r) { return r.status === 'confirmed' }).length,
    Completed: reservations.filter(function (r) { return r.status === 'completed' }).length,
    Cancelled: reservations.filter(function (r) { return r.status === 'cancelled' }).length,
  }

  return (
    <div className="page-enter">
      <Topbar title="Reservations" />

      <div className="p-6 space-y-4">
        {/* Hide scrollbar utility class can be added inline or in css */}
        <div className="flex sm:grid sm:grid-cols-5 gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 snap-x" style={{ scrollbarWidth: 'none' }}>
          {STATUSES.map(function (s) {
            return (
              <div key={s} onClick={function () { setFilter(s) }}
                className={'flex-shrink-0 w-[28%] sm:w-auto p-2 sm:p-3 rounded-lg sm:rounded-xl border cursor-pointer transition-all snap-start ' + (filter === s ? 'bg-[#E1F5EE] border-teal-300' : 'bg-white border-stone-200 hover:border-stone-300')}>
                <p className="text-[9px] sm:text-[11px] text-stone-400 mb-0.5 sm:mb-1">{s}</p>
                <p className={'text-base sm:text-xl font-bold leading-tight ' + (filter === s ? 'text-[#0F6E56]' : 'text-stone-800')}>{totals[s]}</p>
              </div>
            )
          })}
        </div>

        <Card className="p-0 overflow-hidden">
          {loading ? (
            <div className="text-center py-12 text-stone-400">Loading reservations…</div>
          ) : list.length === 0 ? (
            <div className="text-center py-12 text-stone-400">
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm">No reservations found</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[500px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-stone-100">
                    {['Tenant', 'Property', 'Check-in', 'Duration', 'Amount', 'Status'].map(function (h) {
                      return <th key={h} className="text-left px-3 py-2 sm:px-4 sm:py-3 text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 font-medium">{h}</th>
                    })}
                    <th className="text-left px-3 py-2 sm:px-4 sm:py-3 text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map(function (r) {
                    return (
                      <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          <div className="flex items-center gap-1.5 sm:gap-2">
                            <div className="hidden xs:block"><Avatar initials={(r.tenant_name || r.tenant_id || '??').substring(0, 2).toUpperCase()} size="sm" /></div>
                            <span className="text-[10px] sm:text-[12px] font-medium text-stone-800">{r.tenant_name || (r.tenant_id ? r.tenant_id.substring(0, 8) : 'Unknown')}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 truncate max-w-[80px] sm:max-w-none">{r.property_name || getPropName(r.property_id)}</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 whitespace-nowrap">{r.check_in}</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 whitespace-nowrap">{r.duration_months} mo.</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] font-semibold text-[--teal] whitespace-nowrap">{formatCurrency(r.amount_total)}</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3"><Badge variant={STATUS_BADGE[r.status] || 'gray'}>{r.status}</Badge></td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          <div className="flex items-center gap-1">
                            {(isAdmin || isOwner) && r.status === 'pending' && (
                              <div className="flex gap-1 sm:gap-2">
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto" variant="primary" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'confirmed') }}>
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Approve
                                </Button>
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-red-400" /> <span className="text-red-500">Reject</span>
                                </Button>
                              </div>
                            )}
                            {(isAdmin || isOwner) && r.status === 'confirmed' && (
                              <div className="flex gap-1 sm:gap-2">
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Cancel
                                </Button>
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" disabled={actioning === r.id} onClick={function() { handleDelete(r.id) }}>
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Delete
                                </Button>
                              </div>
                            )}
                            {(isAdmin || isOwner) && ['completed', 'cancelled'].includes(r.status) && (
                              <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" disabled={actioning === r.id} onClick={function() { handleDelete(r.id) }}>
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Delete
                              </Button>
                            )}
                            {isTenant && (r.status === 'confirmed' || r.status === 'completed') && (
                              <button 
                                className="px-2 py-1 flex items-center gap-1 rounded bg-[#1D9E75] text-white text-[9px] hover:bg-[#0F6E56] transition-colors"
                                onClick={() => setReviewModal({ isOpen: true, propertyId: r.property_id, propertyName: getPropName(r.property_id) })}
                              >
                                <Star size={10} fill="currentColor" /> Review
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      <AddReviewModal 
        isOpen={reviewModal.isOpen} 
        onClose={() => setReviewModal({ isOpen: false, propertyId: null, propertyName: '' })}
        propertyId={reviewModal.propertyId}
        propertyName={reviewModal.propertyName}
        onReviewAdded={() => alert('Review added successfully!')}
      />
    </div>
  )
}
