import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Card, Badge, Button, Avatar } from '@/components/ui'
import Topbar from '@/components/layout/Topbar'
import { Phone, Mail, MapPin, Calendar, CreditCard, MessageSquare, ExternalLink, ArrowRight, Star } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import ContractViewerModal from '@/components/ui/ContractViewerModal'
import ReviewModal from '@/components/ui/ReviewModal'
import { supabase } from '@/lib/supabase'

export default function MyLandlord() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addToast = useAppStore((s) => s.addToast)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [errorMsg, setErrorMsg] = useState(null)
  const [viewContractUrl, setViewContractUrl] = useState(null)
  const [ratingLandlord, setRatingLandlord] = useState(false)
  const wasHiddenRef = useRef(false)
  const submitReview = useAuthStore(s => s.submitReview)

  const loadLandlord = useCallback(function (silent = false) {
    if (!user?.id) return
    if (!silent) setLoading(true)
    setErrorMsg(null)
    useAuthStore.getState().fetchMyLandlord(user.id).then(function (res) {
      setData(res)
      if (!silent) setLoading(false)
    }).catch(function (err) {
      console.error('Failed to load landlord:', err)
      setErrorMsg(err.message || 'An unknown error occurred')
      if (!silent) setLoading(false)
    })
  }, [user?.id])

  useEffect(function () { loadLandlord() }, [loadLandlord])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('my-landlord-changes')
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
      loadLandlord(true)
    }).on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
      loadLandlord(true)
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, loadLandlord])

  useEffect(function () {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadLandlord(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function () { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadLandlord])



  if (loading) {
    return (
      <div className="page-enter flex flex-col h-screen">
        <Topbar title="My Landlord" />
        <div className="flex-1 flex items-center justify-center text-stone-400">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--teal] mx-auto mb-4" />
            <p className="text-sm">Loading landlord profile...</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data || !data.landlord) {
    return (
      <div className="page-enter flex flex-col h-screen">
        <Topbar title="My Landlord" />
        <div className="flex-1 flex items-center justify-center p-6 bg-stone-50/50">
          <div className="max-w-md w-full text-center p-8 bg-white border border-stone-200 rounded-2xl shadow-sm">
            <div className="w-16 h-16 rounded-full bg-stone-50 flex items-center justify-center text-3xl mb-4 mx-auto border border-stone-100">
              👤
            </div>
            <h2 className="font-bold text-lg text-stone-800 font-semibold mb-1.5">No Active Landlord</h2>
            {errorMsg ? (
              <p className="text-sm text-red-500 mb-6 font-medium bg-red-50 p-3 rounded-lg border border-red-100">
                Error loading data: {errorMsg}
              </p>
            ) : (
              <p className="text-sm text-stone-500 mb-6 leading-relaxed">
                You don't have any confirmed bookings or pending reservations yet. Once you secure a room, your landlord's profile and contact details will appear here.
              </p>
            )}
            <Button variant="primary" className="w-full flex items-center justify-center gap-2" onClick={() => navigate('/tenant/search')}>
              Find a Place to Stay <ArrowRight size={15} />
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const { landlord, property, reservation } = data
  const landlordInitials = landlord.full_name
    ? landlord.full_name.split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const isTransient = reservation?.stay_type === 'transient'
  let expirationDate = '—'
  let durationText = ''
  let leaseRentValue = '—'

  if (isTransient) {
    if (reservation?.check_out) {
      expirationDate = reservation.check_out
      if (reservation?.check_in) {
        const diffTime = Math.abs(new Date(reservation.check_out) - new Date(reservation.check_in))
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
        durationText = `${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
        leaseRentValue = formatCurrency((reservation.amount_total || 0) / (diffDays || 1))
      }
    }
    if (!durationText) {
      durationText = '—'
      leaseRentValue = formatCurrency(reservation?.amount_total || 0)
    }
  } else {
    if (reservation?.check_in) {
      const d = new Date(reservation.check_in)
      d.setMonth(d.getMonth() + (reservation.duration_months || 1))
      expirationDate = d.toISOString().split('T')[0]
    }
    const months = reservation?.duration_months || 1
    durationText = `${months} mo`
    leaseRentValue = formatCurrency((reservation?.amount_total || 0) / months)
  }

  const leaseRentLabel = isTransient ? 'Daily Rent' : 'Monthly Rent'

  return (
    <div className="page-enter flex flex-col h-screen">
      <Topbar title="My Landlord" />

      <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left Column - Landlord Contact Card & Quick Message */}
          <div className="md:col-span-1 space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6 text-center flex flex-col items-center">
              <Avatar url={landlord.avatar_url} initials={landlordInitials} size="lg" className="w-12 h-12 sm:w-16 sm:h-16 text-base sm:text-lg mb-3 sm:mb-4 bg-[#E1F5EE] text-[#0F6E56]" />
              <h2 className="text-[14px] sm:text-[15px] font-bold text-stone-800 mb-0.5">{landlord.full_name}</h2>
              <Badge variant="teal" className="mb-4 sm:mb-6">Homeowner</Badge>

              <div className="w-full space-y-3 sm:space-y-4 text-left border-t border-stone-100 pt-4">
                <div className="flex items-start gap-2 sm:gap-3">
                  <Phone className="w-[13px] h-[13px] sm:w-[15px] sm:h-[15px] text-stone-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-400">Phone</p>
                    <a href={`tel:${landlord.contact || ''}`} className="text-[12px] sm:text-sm font-medium text-stone-700 hover:text-[--teal] transition-colors break-words">
                      {landlord.contact || 'No phone provided'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <Mail className="w-[13px] h-[13px] sm:w-[15px] sm:h-[15px] text-stone-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-400">Email Address</p>
                    <p className="text-[12px] sm:text-sm font-medium text-stone-700 break-all">
                      {landlord.email || 'No email provided'}
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-2 sm:gap-3">
                  <MapPin className="w-[13px] h-[13px] sm:w-[15px] sm:h-[15px] text-stone-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-400">Municipality</p>
                    <p className="text-[12px] sm:text-sm font-medium text-stone-700">{landlord.municipality || 'Basco'}</p>
                  </div>
                </div>
              </div>


            </Card>

            {/* Chat Action */}
            <Card className="p-5 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-2xl bg-teal-50 flex items-center justify-center mb-3 text-[--teal]">
                <MessageSquare size={20} />
              </div>
              <h3 className="text-[13px] font-bold text-stone-800 mb-1">Have a question?</h3>
              <p className="text-[11px] text-stone-500 mb-4 px-2">
                Use the messaging system to securely chat with {landlord.full_name?.split(' ')[0]}.
              </p>
              <Button
                variant="primary"
                className="w-full justify-center gap-1.5 shadow-sm hover:shadow-md transition-all"
                onClick={() => navigate('/tenant/messages', {
                  state: { autoSelectUser: { id: landlord.id, full_name: landlord.full_name, role: 'owner' } }
                })}
              >
                Chat with Landlord <ExternalLink size={14} />
              </Button>
              <Button
                variant="ghost"
                className="w-full mt-2 justify-center gap-1.5 text-amber-600 hover:bg-amber-50"
                onClick={() => setRatingLandlord(true)}
              >
                Rate Landlord <Star size={14} />
              </Button>
            </Card>
          </div>

          {/* Right Column - Tenancy & Property details */}
          <div className="md:col-span-2 space-y-4 sm:space-y-6">
            <Card className="p-0 overflow-hidden">
              <div className="p-3 sm:p-5 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-800 text-[13px] sm:text-[14px]">My Tenancy</h3>
                  <p className="text-[9px] sm:text-[11px] text-stone-400 mt-0.5">Lease details</p>
                </div>
                <Badge variant={reservation.status === 'confirmed' ? 'teal' : reservation.status === 'pending' ? 'amber' : 'gray'} className="text-[9px] sm:text-[11px]">
                  {reservation.status === 'confirmed' ? 'Active' : reservation.status === 'pending' ? 'Pending Approval' : reservation.status}
                </Badge>
              </div>

              <div className="p-3 sm:p-5 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4 bg-stone-50/30">
                <div className="flex gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white border border-stone-200/60 flex items-center justify-center text-stone-400 shadow-sm flex-shrink-0">
                    <Calendar className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] text-[--teal]" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 truncate">Move-in Date</p>
                    <p className="text-[11px] sm:text-sm font-semibold text-stone-700 truncate">{reservation.check_in || '—'}</p>
                    <p className="text-[8px] sm:text-[10px] text-stone-400 mt-0.5 truncate">Duration: {durationText}</p>
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white border border-stone-200/60 flex items-center justify-center text-stone-400 shadow-sm flex-shrink-0">
                    <Calendar className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] text-red-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 truncate">Expires On</p>
                    <p className="text-[11px] sm:text-sm font-semibold text-stone-700 truncate">{expirationDate}</p>
                    {reservation.contract_url ? (
                      <>
                        <button 
                          onClick={() => setViewContractUrl(reservation.contract_url)} 
                          className="text-[8px] sm:text-[10px] text-[--teal] hover:underline flex items-center gap-1 mt-0.5 bg-transparent border-none p-0 cursor-pointer text-left"
                        >
                          <ExternalLink size={10} /> View Contract
                        </button>
                        {viewContractUrl === reservation.contract_url && (
                          <ContractViewerModal 
                            url={reservation.contract_url} 
                            onClose={() => setViewContractUrl(null)} 
                          />
                        )}
                      </>
                    ) : (
                      <p className="text-[8px] sm:text-[10px] text-stone-400 mt-0.5 truncate">No contract uploaded</p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 sm:gap-3">
                  <div className="w-7 h-7 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-white border border-stone-200/60 flex items-center justify-center text-stone-400 shadow-sm flex-shrink-0">
                    <CreditCard className="w-[12px] h-[12px] sm:w-[16px] sm:h-[16px] text-[#BA7517]" />
                  </div>
                  <div>
                    <p className="text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 truncate">{leaseRentLabel}</p>
                    <p className="text-[11px] sm:text-sm font-semibold text-stone-700 truncate">{leaseRentValue}</p>
                    <p className="text-[8px] sm:text-[10px] text-stone-400 mt-0.5 truncate">Total: {formatCurrency(reservation.amount_total)}</p>
                  </div>
                </div>
              </div>

              {reservation.notes && (
                <div className="p-3 sm:p-5 border-t border-stone-100">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">Reservation Notes</p>
                  <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100 leading-relaxed italic">
                    "{reservation.notes}"
                  </p>
                </div>
              )}
            </Card>


            {/* Emergency & Rules Reminder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card className="p-4 border-l-4 border-l-red-400">
                <h4 className="text-[12px] font-semibold text-stone-800 mb-1">Support & Assistance</h4>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Having maintenance issues with your room or the property? Please contact your landlord directly using the buttons on the left.
                </p>
              </Card>

              <Card className="p-4 border-l-4 border-l-teal-400">
                <h4 className="text-[12px] font-semibold text-stone-800 mb-1">Payment Information</h4>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  SmartStay does not process online payments. All rent and deposits must be paid directly to your landlord (via cash, GCash, or bank transfer). Please request a receipt from your landlord for your own records.
                </p>
              </Card>
            </div>
          </div>

        </div>
      </div>

      <ReviewModal 
        isOpen={ratingLandlord}
        onClose={() => setRatingLandlord(false)}
        targetUser={{ id: landlord.id, full_name: landlord.full_name }}
        reservationId={reservation?.id}
        onSubmit={async (payload) => {
          await submitReview(payload)
          addToast('Review submitted successfully!', 'success')
          loadLandlord()
        }}
      />
    </div>
  )
}
