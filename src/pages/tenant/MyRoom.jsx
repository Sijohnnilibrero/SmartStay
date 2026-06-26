import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Card, Badge, Button, Avatar } from '@/components/ui'
import Topbar from '@/components/layout/Topbar'
import { MapPin, Calendar, CreditCard, BedDouble, Phone, Mail, CheckCircle2, ArrowRight, FileText } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import ContractViewerModal from '@/components/ui/ContractViewerModal'

export default function MyRoom() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [viewContractUrl, setViewContractUrl] = useState(null)
  const wasHiddenRef = useRef(false)

  const loadRoom = useCallback(function() {
    if (!user?.id) return
    setLoading(true)
    useAuthStore.getState().fetchMyRoom(user.id).then(function(res) {
      setData(res)
      setLoading(false)
    }).catch(function(err) {
      console.error('Failed to load room:', err)
      setLoading(false)
    })
  }, [user?.id])

  useEffect(function() { loadRoom() }, [loadRoom])

  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadRoom()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function() { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadRoom])

  if (loading) {
    return (
      <div className="page-enter flex flex-col h-screen">
        <Topbar title="My Room" />
        <div className="flex-1 flex items-center justify-center text-stone-400">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--teal] mx-auto mb-4" />
            <p className="text-sm">Loading your room...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.reservation) {
    return (
      <div className="page-enter flex flex-col h-screen">
        <Topbar title="My Room" />
        <div className="flex-1 flex items-center justify-center p-6 bg-stone-50/50">
          <div className="max-w-md w-full text-center p-8 bg-white border border-stone-200 rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center text-3xl mb-4 mx-auto border border-stone-100">
              🚪
            </div>
            <h2 className="font-bold text-lg text-stone-800 font-semibold mb-1.5">No Active Room</h2>
            <p className="text-sm text-stone-500 mb-6 leading-relaxed">
              You don't have an approved room reservation yet. Browse properties and reserve a room, then wait for the homeowner to approve your request.
            </p>
            <Button variant="primary" className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/tenant/search')}>
              Find a Place to Stay <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { room, property, reservation } = data

  let expirationDate = '—'
  if (reservation?.check_in) {
    const d = new Date(reservation.check_in)
    d.setMonth(d.getMonth() + (reservation.duration_months || 1))
    expirationDate = d.toISOString().split('T')[0]
  }

  return (
    <div className="page-enter flex flex-col h-screen">
      <Topbar title="My Room" />

      <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
        <div className="max-w-4xl mx-auto space-y-6">

          {/* Room Card */}
          {room && (
            <Card className="p-0 overflow-hidden">
              <div className="p-3 sm:p-5 border-b border-stone-100 flex items-center justify-between">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-[#E1F5EE] flex items-center justify-center">
                    <BedDouble className="w-[18px] h-[18px] sm:w-[22px] sm:h-[22px] text-[#0F6E56]" />
                  </div>
                  <div>
                    <h2 className="font-bold text-lg sm:text-xl text-stone-800">Room {room.room_number}</h2>
                    <p className="text-[10px] sm:text-[12px] text-stone-400">Floor {room.floor}</p>
                  </div>
                </div>
                <Badge variant="teal">Active</Badge>
              </div>

              <div className="p-3 sm:p-5 grid grid-cols-3 gap-2 sm:gap-4">
                <div className="p-2 sm:p-3 bg-stone-50 rounded-lg sm:rounded-xl">
                  <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Rent</p>
                  <p className="text-sm sm:text-lg font-bold text-[--teal]">{formatCurrency(room.price_monthly)}</p>
                </div>
                <div className="p-2 sm:p-3 bg-stone-50 rounded-lg sm:rounded-xl">
                  <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Move-in</p>
                  <p className="text-[11px] sm:text-[14px] font-semibold text-stone-800 truncate">{reservation.check_in || '—'}</p>
                </div>
                <div className="p-2 sm:p-3 bg-stone-50 rounded-lg sm:rounded-xl">
                  <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 mb-0.5 sm:mb-1 truncate">Duration</p>
                  <p className="text-[11px] sm:text-[14px] font-semibold text-stone-800 truncate">{reservation.duration_months || 1} mo</p>
                </div>
              </div>

              {room.amenities && room.amenities.length > 0 && (
                <div className="px-3 pb-3 sm:px-5 sm:pb-5">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-400 mb-1.5 sm:mb-2">Room Amenities</p>
                  <div className="flex flex-wrap gap-1 sm:gap-2">
                    {room.amenities.map(function(a) {
                      return (
                        <span key={a} className="text-[9px] sm:text-[11px] px-2 py-0.5 sm:px-2.5 sm:py-1 bg-[#E1F5EE] text-[#0F6E56] rounded-md sm:rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-[10px] h-[10px] sm:w-[11px] sm:h-[11px]" /> {a}
                        </span>
                      )
                    })}
                  </div>
                </div>
              )}

              {room.notes && (
                <div className="px-5 pb-5">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">Notes</p>
                  <p className="text-[12px] text-stone-600 italic">{room.notes}</p>
                </div>
              )}
            </Card>
          )}

          {/* Property Info */}
          {property && (
            <Card className="p-0 overflow-hidden">
              <div className="p-3 sm:p-5 border-b border-stone-100">
                <h3 className="font-semibold text-stone-800 text-[13px] sm:text-[14px]">Property Details</h3>
              </div>
              <div className="p-3 sm:p-5">
                <div className="flex items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-stone-50 border border-stone-200/60 rounded-lg sm:rounded-xl">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-xl sm:text-2xl flex-shrink-0">🏠</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] sm:text-[13px] font-bold text-stone-800 truncate">{property.name}</p>
                    <p className="text-[9px] sm:text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                      <MapPin className="w-[9px] h-[9px] sm:w-[11px] sm:h-[11px] text-stone-400 flex-shrink-0" />
                      {property.address}, {property.municipality}, {property.island} Island
                    </p>
                  </div>
                  <Button variant="default" size="sm" onClick={() => navigate('/tenant/property/' + property.id)} className="flex-shrink-0 px-2 sm:px-3 text-[10px] sm:text-sm">
                    View
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Lease Summary */}
          <Card className="p-0 overflow-hidden">
            <div className="p-3 sm:p-5 border-b border-stone-100">
              <h3 className="font-semibold text-stone-800 text-[13px] sm:text-[14px]">Lease Summary</h3>
            </div>
            <div className="p-3 sm:p-5 space-y-1 sm:space-y-3">
              <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-stone-50">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-stone-500">
                  <Calendar className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" /> Check-in Date
                </div>
                <span className="text-[11px] sm:text-[12px] font-medium text-stone-800">{reservation.check_in || '—'}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-stone-50">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-stone-500">
                  <Calendar className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" /> Duration
                </div>
                <span className="text-[11px] sm:text-[12px] font-medium text-stone-800">{reservation.duration_months || 1} {(reservation.duration_months || 1) === 1 ? 'month' : 'months'}</span>
              </div>
                <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-stone-50">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-stone-500">
                    <Calendar className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" /> Expires On
                  </div>
                  <span className="text-[11px] sm:text-[12px] font-medium text-red-500">{expirationDate}</span>
                </div>
                <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-stone-50">
                  <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-stone-500">
                    <FileText className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" /> Contract Document
                  </div>
                {reservation.contract_url ? (
                  <>
                    <button 
                      onClick={() => setViewContractUrl(reservation.contract_url)} 
                      className="text-[11px] sm:text-[12px] font-medium text-[--teal] hover:underline bg-transparent border-none p-0 cursor-pointer text-left"
                    >
                      View Contract
                    </button>
                    {viewContractUrl === reservation.contract_url && (
                      <ContractViewerModal 
                        url={reservation.contract_url} 
                        onClose={() => setViewContractUrl(null)} 
                      />
                    )}
                  </>
                ) : (
                    <span className="text-[11px] sm:text-[12px] font-medium text-stone-400">Not uploaded</span>
                  )}
                </div>
              <div className="flex items-center justify-between py-1.5 sm:py-2 border-b border-stone-50">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-stone-500">
                  <CreditCard className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" /> Monthly Rent
                </div>
                <span className="text-[11px] sm:text-[12px] font-medium text-stone-800">{formatCurrency(reservation.amount_total / (reservation.duration_months || 1))}</span>
              </div>
              <div className="flex items-center justify-between py-1.5 sm:py-2">
                <div className="flex items-center gap-1.5 sm:gap-2 text-[11px] sm:text-[12px] text-stone-500">
                  <CreditCard className="w-[11px] h-[11px] sm:w-[13px] sm:h-[13px]" /> Total Amount
                </div>
                <span className="text-[12px] sm:text-[13px] font-semibold text-[--teal]">{formatCurrency(reservation.amount_total)}</span>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="p-4 border-l-4 border-l-teal-400">
              <h4 className="text-[12px] font-semibold text-stone-800 mb-1">Need Help?</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                Contact your landlord directly through the My Landlord tab for any concerns about your room or the property.
              </p>
              <Button variant="ghost" size="sm" className="mt-2 px-0" onClick={() => navigate('/tenant/landlord')}>
                Go to My Landlord <ArrowRight size={12} />
              </Button>
            </Card>
            <Card className="p-4 border-l-4 border-l-amber-400">
              <h4 className="text-[12px] font-semibold text-stone-800 mb-1">Payment Information</h4>
              <p className="text-[11px] text-stone-500 leading-relaxed">
                SmartStay does not process online payments. All rent and deposits must be paid directly to your landlord (via cash, GCash, or bank transfer). Please request a receipt from your landlord for your own records.
              </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
