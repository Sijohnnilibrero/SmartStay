import { useState, useEffect, useCallback, useRef } from 'react'
import Topbar from '@/components/layout/Topbar'
import { supabase } from '@/lib/supabase'
import { Card, Badge, Avatar, Button } from '@/components/ui'
import ContractViewerModal from '@/components/ui/ContractViewerModal'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { CheckCircle, XCircle, Trash2, Star, Upload } from 'lucide-react'
import TenantProfileModal from '@/components/ui/TenantProfileModal'
import AddReviewModal from '@/components/AddReviewModal'
import ImageViewerModal from '@/components/ui/ImageViewerModal'

var STATUSES = ['All', 'Pending', 'Awaiting_Payment', 'Confirmed', 'Completed', 'Cancelled']
var STATUS_BADGE = { pending: 'amber', awaiting_payment: 'blue', confirmed: 'teal', completed: 'gray', cancelled: 'coral' }

export default function Reservations() {
  var user = useAuthStore(function (s) { return s.user })
  var isAdmin = useAuthStore(function (s) { return s.isAdmin() })
  var isOwner = useAuthStore(function (s) { return s.isOwner() })
  var isTenant = useAuthStore(function (s) { return s.isTenant() })
  var fetchReservations = useAuthStore(function (s) { return s.fetchReservations })
  var updateReservationStatus = useAuthStore(function (s) { return s.updateReservationStatus })
  var deleteReservation = useAuthStore(function (s) { return s.deleteReservation })
  var fetchProperties = useAuthStore(function (s) { return s.fetchProperties })
  var uploadPaymentReceipt = useAuthStore(function (s) { return s.uploadPaymentReceipt })
  var uploadContract = useAuthStore(function (s) { return s.uploadContract })
  var addToast = useAppStore(function (s) { return s.addToast })
  var systemConfirm = useAppStore(function (s) { return s.systemConfirm })

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
  var [selectedTenant, setSelectedTenant] = useState(null)
  var wasHiddenRef = useRef(false)
  
  var reviewModalState = useState({ isOpen: false, propertyId: null, propertyName: '' })
  var reviewModal = reviewModalState[0], setReviewModal = reviewModalState[1]
  const [viewContractUrl, setViewContractUrl] = useState(null)
  const [viewingImage, setViewingImage] = useState(null)

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
      } else if (isAdmin && user?.admin_region) {
        var regionProps = results[1] || []
        if (user.admin_region === 'Batan Island') {
          regionProps = regionProps.filter(p => ['Basco', 'Mahatao', 'Ivana', 'Uyugan'].includes(p.municipality))
        } else {
          regionProps = regionProps.filter(p => p.municipality === user.admin_region)
        }
        var regionPropIds = regionProps.map(p => p.id)
        data = all.filter(r => regionPropIds.includes(r.property_id))
      }

      setReservations(data)
      setLoading(false)
    }).catch(function (err) {
      console.error('Failed to load reservations:', err)
      setLoading(false)
    })
  }, [isAdmin, isOwner, user?.id, fetchReservations, fetchProperties])

  useEffect(function () { loadReservations() }, [loadReservations])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('reservations-page-changes')
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
      loadReservations()
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, loadReservations])

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

  async function handleStatus(id, status) {
    var actionText = status === 'confirmed' ? 'confirm' : status === 'cancelled' ? 'reject/cancel' : status === 'awaiting_payment' ? 'request payment for' : status;
    if (!(await systemConfirm('Are you sure you want to ' + actionText + ' this reservation?'))) return;

    setActioning(id)
    updateReservationStatus(id, status).then(function () {
      setReservations(function (prev) {
        return prev.map(function (r) {
          return r.id === id ? Object.assign({}, r, { status: status }) : r
        })
      })
    }).catch(function (err) {
      console.error('Status update failed:', err)
      addToast('Action failed: ' + (err.message || 'Unknown error'), 'error')
    }).finally(function () {
      setActioning(null)
    })
  }

  async function handleUploadReceipt(id, event) {
    var file = event.target.files[0]
    if (!file) return
    setActioning(id)
    try {
      var url = await uploadPaymentReceipt(file, id)
      setReservations(function (prev) {
        return prev.map(function (r) {
          return r.id === id ? Object.assign({}, r, { payment_receipt_url: url }) : r
        })
      })
      addToast('Receipt uploaded successfully! Waiting for homeowner verification.', 'success')
    } catch (err) {
      console.error(err)
      addToast('Failed to upload receipt: ' + err.message, 'error')
    } finally {
      setActioning(null)
    }
  }

  async function handleUploadContract(id, event) {
    var file = event.target.files[0]
    if (!file) return
    setActioning(id)
    try {
      var url = await uploadContract(file, id)
      setReservations(function (prev) {
        return prev.map(function (r) {
          return r.id === id ? Object.assign({}, r, { contract_url: url }) : r
        })
      })
      addToast('Contract uploaded successfully!', 'success')
    } catch (err) {
      console.error(err)
      addToast('Failed to upload contract: ' + err.message, 'error')
    } finally {
      setActioning(null)
    }
  }

  async function handleDelete(id) {
    if (!(await systemConfirm('Are you sure you want to delete this reservation?'))) return
    setActioning(id)
    deleteReservation(id).then(function () {
      setReservations(function (prev) {
        return prev.filter(function (r) { return r.id !== id })
      })
    }).catch(function (err) {
      console.error('Delete failed:', err)
      addToast('Failed to delete reservation: ' + err.message, 'error')
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
    Awaiting_Payment: reservations.filter(function (r) { return r.status === 'awaiting_payment' }).length,
    Confirmed: reservations.filter(function (r) { return r.status === 'confirmed' }).length,
    Completed: reservations.filter(function (r) { return r.status === 'completed' }).length,
    Cancelled: reservations.filter(function (r) { return r.status === 'cancelled' }).length,
  }

  return (
    <div className="page-enter">
      <Topbar title="Reservations" />

      <div className="p-6 space-y-4">
        {/* Hide scrollbar utility class can be added inline or in css */}
        <div className="flex sm:grid sm:grid-cols-6 gap-2 sm:gap-3 overflow-x-auto pb-2 sm:pb-0 snap-x" style={{ scrollbarWidth: 'none' }}>
          {STATUSES.map(function (s) {
            return (
              <div key={s} onClick={function () { setFilter(s) }}
                className={'flex-shrink-0 w-[35%] sm:w-auto p-2 sm:p-3 rounded-lg sm:rounded-xl border cursor-pointer transition-all snap-start ' + (filter === s ? 'bg-[#E1F5EE] border-teal-300' : 'bg-white border-stone-200 hover:border-stone-300')}>
                <p className="text-[9px] sm:text-[10px] text-stone-400 mb-0.5 sm:mb-1 truncate">{s.replace('_', ' ')}</p>
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
              <table className="w-full min-w-[650px] sm:min-w-0">
                <thead>
                  <tr className="border-b border-stone-100">
                    {['Tenant', 'Property', 'Check-in', 'Duration', 'Expires On', 'Amount', 'Status'].map(function (h) {
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
                          <div 
                            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer hover:bg-stone-100 p-1 -m-1 rounded transition-colors"
                            onClick={() => (isAdmin || isOwner) && setSelectedTenant(r)}
                          >
                            <div className="hidden xs:block">
                              {r.tenant_avatar ? (
                                <img src={r.tenant_avatar} alt="Avatar" className="w-6 h-6 sm:w-8 sm:h-8 rounded-full object-cover" />
                              ) : (
                                <Avatar initials={(r.tenant_name || r.tenant_id || '??').substring(0, 2).toUpperCase()} size="sm" />
                              )}
                            </div>
                            <span className="text-[10px] sm:text-[12px] font-medium text-teal-600 hover:underline">{r.tenant_name || (r.tenant_id ? r.tenant_id.substring(0, 8) : 'Unknown')}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 truncate max-w-[80px] sm:max-w-none">{r.property_name || getPropName(r.property_id)}</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 whitespace-nowrap">{r.check_in}</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 whitespace-nowrap">{r.duration_months} mo.</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-red-500 whitespace-nowrap font-medium">
                          {(() => {
                            if (!r.check_in) return '—'
                            const d = new Date(r.check_in)
                            d.setMonth(d.getMonth() + (r.duration_months || 1))
                            return d.toLocaleDateString()
                          })()}
                        </td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] font-semibold text-[--teal] whitespace-nowrap">{formatCurrency(r.amount_total)}</td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3"><Badge variant={STATUS_BADGE[r.status] || 'gray'} className="text-[9px] sm:text-[10px] truncate">{r.status.replace('_', ' ')}</Badge></td>
                        <td className="px-3 py-2 sm:px-4 sm:py-3">
                          <div className="flex items-center gap-1 flex-wrap">
                            {(isAdmin || isOwner) && r.status === 'pending' && (
                              <div className="flex gap-1 sm:gap-2">
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto" variant="primary" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'awaiting_payment') }}>
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Req. Payment
                                </Button>
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[12px] h-auto" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1 text-red-400" /> <span className="text-red-500">Reject</span>
                                </Button>
                              </div>
                            )}
                            
                            {(isAdmin || isOwner) && r.status === 'awaiting_payment' && (
                              <div className="flex gap-1 sm:gap-2">
                                {r.payment_receipt_url && (
                                  <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto border border-blue-500 text-blue-600 hover:bg-blue-50" variant="ghost" disabled={actioning === r.id} onClick={() => setViewingImage(r.payment_receipt_url)}>
                                    View Receipt
                                  </Button>
                                )}
                                {!r.payment_receipt_url && (
                                  <span className="text-[9px] sm:text-[10px] text-stone-400 italic px-1 whitespace-nowrap">Awaiting upload...</span>
                                )}
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto" variant="primary" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'confirmed') }}>
                                  <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Confirm
                                </Button>
                                <Button className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  Cancel
                                </Button>
                              </div>
                            )}

                            {isTenant && r.status === 'pending' && (
                              <div className="flex gap-1 sm:gap-2">
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Cancel Request
                                </Button>
                              </div>
                            )}

                            {isTenant && r.status === 'awaiting_payment' && (
                              <div className="flex items-center gap-1 sm:gap-2">
                                <label className={"cursor-pointer px-2 py-1 flex items-center gap-1 rounded text-[9px] sm:text-[11px] transition-colors whitespace-nowrap " + (r.payment_receipt_url ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-blue-500 text-white hover:bg-blue-600')}>
                                  <Upload size={12} /> {r.payment_receipt_url ? 'Re-upload Receipt' : 'Upload Receipt'}
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadReceipt(r.id, e)} disabled={actioning === r.id} />
                                </label>
                                {r.payment_receipt_url && <span className="text-[9px] sm:text-[10px] text-green-600 font-medium">Uploaded</span>}
                                <Button className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  Cancel
                                </Button>
                              </div>
                            )}

                            {(isAdmin || isOwner) && r.status === 'confirmed' && (
                              <div className="flex gap-1 sm:gap-2">
                                <label className={"cursor-pointer px-1.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 rounded text-[9px] sm:text-[11px] transition-colors whitespace-nowrap border " + (r.contract_url ? 'border-blue-500 text-blue-600 hover:bg-blue-50' : 'bg-blue-500 text-white hover:bg-blue-600')}>
                                  <Upload size={12} /> {r.contract_url ? 'Update Contract' : 'Upload Contract'}
                                  <input type="file" className="hidden" accept="application/pdf,image/*" onChange={(e) => handleUploadContract(r.id, e)} disabled={actioning === r.id} />
                                </label>
                                {r.contract_url && (
                                  <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto border border-stone-200" variant="ghost" disabled={actioning === r.id} onClick={() => setViewContractUrl(r.contract_url)}>
                                    View Contract
                                  </Button>
                                )}
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Cancel
                                </Button>
                                <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" disabled={actioning === r.id} onClick={function() { handleDelete(r.id) }}>
                                  <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Delete
                                </Button>
                              </div>
                            )}

                            {(isAdmin || isOwner) && ['completed', 'cancelled'].includes(r.status) && (
                              <Button className="px-1.5 sm:px-3 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50 hover:text-red-700" variant="ghost" disabled={actioning === r.id} onClick={function() { handleDelete(r.id) }}>
                                <Trash2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Delete
                              </Button>
                            )}

                            {isTenant && (r.status === 'confirmed' || r.status === 'completed') && (
                              <button 
                                className="px-2 py-1 flex items-center gap-1 rounded bg-[#1D9E75] text-white text-[9px] sm:text-[11px] hover:bg-[#0F6E56] transition-colors"
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
        onReviewAdded={() => addToast('Review added successfully!', 'success')}
      />

      <ContractViewerModal 
        url={viewContractUrl} 
        onClose={() => setViewContractUrl(null)} 
      />

      <TenantProfileModal 
        isOpen={!!selectedTenant} 
        tenantId={selectedTenant?.tenant_id || selectedTenant?.id} 
        onClose={() => setSelectedTenant(null)} 
      />
    </div>
  )
}
