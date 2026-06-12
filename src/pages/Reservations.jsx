import { useState, useEffect, useCallback, useRef } from 'react'
import Topbar from '@/components/layout/Topbar'
import { Card, Badge, Avatar, FilterChip, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { CheckCircle, XCircle, Trash2 } from 'lucide-react'

var STATUSES = ['All', 'Pending', 'Confirmed', 'Completed', 'Cancelled']
var STATUS_BADGE = { pending: 'amber', confirmed: 'teal', completed: 'gray', cancelled: 'coral' }

export default function Reservations() {
  var user = useAuthStore(function (s) { return s.user })
  var isAdmin = useAuthStore(function (s) { return s.isAdmin() })
  var isOwner = useAuthStore(function (s) { return s.isOwner() })
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
        <div className="grid grid-cols-5 gap-3">
          {STATUSES.map(function (s) {
            return (
              <div key={s} onClick={function () { setFilter(s) }}
                className={'p-3 rounded-xl border cursor-pointer transition-all ' + (filter === s ? 'bg-[#E1F5EE] border-teal-300' : 'bg-white border-stone-200 hover:border-stone-300')}>
                <p className="text-[11px] text-stone-400 mb-1">{s}</p>
                <p className={'text-xl font-bold ' + (filter === s ? 'text-[#0F6E56]' : 'text-stone-800')}>{totals[s]}</p>
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
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100">
                  {['Tenant', 'Property', 'Check-in', 'Duration', 'Amount', 'Status'].map(function (h) {
                    return <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-stone-400 font-medium">{h}</th>
                  })}
                  {(isAdmin || isOwner) && <th className="text-left px-4 py-3 text-[10px] uppercase tracking-wider text-stone-400 font-medium">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {list.map(function (r) {
                  return (
                    <tr key={r.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar initials={(r.tenant_id || '??').substring(0, 2).toUpperCase()} size="sm" />
                          <span className="text-[12px] font-medium text-stone-800">{r.tenant_id ? r.tenant_id.substring(0, 8) : 'Unknown'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-stone-600">{getPropName(r.property_id)}</td>
                      <td className="px-4 py-3 text-[12px] text-stone-600">{r.check_in}</td>
                      <td className="px-4 py-3 text-[12px] text-stone-600">{r.duration_months} mo.</td>
                      <td className="px-4 py-3 text-[12px] font-semibold text-[--teal]">{formatCurrency(r.amount_total)}</td>
                      <td className="px-4 py-3"><Badge variant={STATUS_BADGE[r.status] || 'gray'}>{r.status}</Badge></td>
                      {(isAdmin || isOwner) && (
                        <td className="px-4 py-3">
                          {r.status === 'pending' ? (
                            <div className="flex gap-1">
                              <button className="p-1.5 rounded-lg text-[#0F6E56] hover:bg-[#E1F5EE] disabled:opacity-50" disabled={actioning === r.id} onClick={function () { handleStatus(r.id, 'confirmed') }}>
                                <CheckCircle size={13} />
                              </button>
                              <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50" disabled={actioning === r.id} onClick={function () { handleStatus(r.id, 'cancelled') }}>
                                <XCircle size={13} />
                              </button>
                            </div>
                          ) : r.status === 'confirmed' ? (
                            <div className="flex gap-1">
                              {(isOwner || isAdmin) && (
                                <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50" disabled={actioning === r.id} onClick={function () { handleStatus(r.id, 'cancelled') }} title="Cancel Reservation">
                                  <XCircle size={13} />
                                </button>
                              )}
                              {(isOwner || isAdmin) && (
                                <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50" disabled={actioning === r.id} onClick={function () { handleDelete(r.id) }} title="Delete Reservation">
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          ) : (
                            (isOwner || isAdmin) && (
                              <button className="p-1.5 rounded-lg text-red-400 hover:bg-red-50 disabled:opacity-50" disabled={actioning === r.id} onClick={function () { handleDelete(r.id) }}>
                                <Trash2 size={13} />
                              </button>
                            )
                          )}
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </div>
  )
}
