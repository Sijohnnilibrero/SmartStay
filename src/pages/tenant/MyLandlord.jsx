import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Card, Badge, Button, Avatar } from '@/components/ui'
import Topbar from '@/components/layout/Topbar'
import { Phone, Mail, MapPin, Calendar, CreditCard, MessageSquare, Send, ArrowRight } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

export default function MyLandlord() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const addToast = useAppStore((s) => s.addToast)

  const [loading, setLoading] = useState(true)
  const [data, setData] = useState(null)
  const [messageText, setMessageText] = useState('')
  const [sending, setSending] = useState(false)
  const [errorMsg, setErrorMsg] = useState(null)
  const wasHiddenRef = useRef(false)

  const loadLandlord = useCallback(function() {
    if (!user?.id) return
    setLoading(true)
    setErrorMsg(null)
    useAuthStore.getState().fetchMyLandlord(user.id).then(function(res) {
      setData(res)
      setLoading(false)
    }).catch(function(err) {
      console.error('Failed to load landlord:', err)
      setErrorMsg(err.message || 'An unknown error occurred')
      setLoading(false)
    })
  }, [user?.id])

  useEffect(function() { loadLandlord() }, [loadLandlord])

  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadLandlord()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function() { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadLandlord])

  const handleSendMessage = (e) => {
    e.preventDefault()
    if (!messageText.trim()) return
    setSending(true)
    setTimeout(() => {
      addToast(`Message sent to ${data?.landlord?.full_name || 'Landlord'}!`, 'success')
      setMessageText('')
      setSending(false)
    }, 800)
  }

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

  return (
    <div className="page-enter flex flex-col h-screen">
      <Topbar title="My Landlord" />

      <div className="flex-1 overflow-y-auto p-6 bg-stone-50/50">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Left Column - Landlord Contact Card & Quick Message */}
          <div className="md:col-span-1 space-y-6">
            <Card className="p-6 text-center flex flex-col items-center">
              <Avatar initials={landlordInitials} size="lg" className="w-16 h-16 text-lg mb-4 bg-[#E1F5EE] text-[#0F6E56]" />
              <h2 className="text-[15px] font-bold text-stone-800 mb-0.5">{landlord.full_name}</h2>
              <Badge variant="teal" className="mb-6">Homeowner</Badge>

              <div className="w-full space-y-4 text-left border-t border-stone-100 pt-4">
                <div className="flex items-start gap-3">
                  <Phone size={15} className="text-stone-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Phone</p>
                    <a href={`tel:${landlord.contact || ''}`} className="text-sm font-medium text-stone-700 hover:text-[--teal] transition-colors break-words">
                      {landlord.contact || 'No phone provided'}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail size={15} className="text-stone-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Email Address</p>
                    <a href={`mailto:${landlord.email}`} className="text-sm font-medium text-stone-700 hover:text-[--teal] transition-colors break-all">
                      {landlord.email}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <MapPin size={15} className="text-stone-400 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Municipality</p>
                    <p className="text-sm font-medium text-stone-700">{landlord.municipality || 'Basco'}</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5 w-full mt-6">
                <a href={`tel:${landlord.contact || ''}`} className="flex-1">
                  <Button variant="default" size="sm" className="w-full justify-center">
                    <Phone size={13} /> Call
                  </Button>
                </a>
                <a href={`mailto:${landlord.email}`} className="flex-1">
                  <Button variant="default" size="sm" className="w-full justify-center">
                    <Mail size={13} /> Email
                  </Button>
                </a>
              </div>
            </Card>

            {/* Quick Contact Form */}
            <Card className="p-4">
              <h3 className="text-[12px] font-semibold text-stone-800 mb-3 flex items-center gap-1.5">
                <MessageSquare size={13} className="text-[--teal]" />
                Send Quick Message
              </h3>
              <form onSubmit={handleSendMessage} className="space-y-3">
                <textarea
                  placeholder={`Write a message to ${landlord.full_name.split(' ')[0]}...`}
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2.5 rounded-lg border border-stone-200 bg-white placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all resize-none"
                  required
                />
                <Button variant="primary" size="sm" className="w-full justify-center gap-1.5" type="submit" disabled={sending}>
                  <Send size={12} /> {sending ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </Card>
          </div>

          {/* Right Column - Tenancy & Property details */}
          <div className="md:col-span-2 space-y-6">
            <Card className="p-0 overflow-hidden">
              <div className="p-5 border-b border-stone-100 flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-stone-800 text-[14px]">My Tenancy</h3>
                  <p className="text-[11px] text-stone-400 mt-0.5">Lease details & property info</p>
                </div>
                <Badge variant={reservation.status === 'confirmed' ? 'teal' : reservation.status === 'pending' ? 'amber' : 'gray'}>
                  {reservation.status === 'confirmed' ? 'Active Residency' : reservation.status === 'pending' ? 'Pending Approval' : reservation.status}
                </Badge>
              </div>

              <div className="p-5 grid grid-cols-2 gap-4 border-b border-stone-100 bg-stone-50/30">
                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-stone-200/60 flex items-center justify-center text-stone-400 shadow-sm flex-shrink-0">
                    <Calendar size={16} className="text-[--teal]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Move-in Date</p>
                    <p className="text-sm font-semibold text-stone-700">{reservation.check_in || '—'}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Duration: {reservation.duration_months || 1} {reservation.duration_months === 1 ? 'month' : 'months'}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white border border-stone-200/60 flex items-center justify-center text-stone-400 shadow-sm flex-shrink-0">
                    <CreditCard size={16} className="text-[#BA7517]" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-stone-400">Monthly Rent</p>
                    <p className="text-sm font-semibold text-stone-700">{formatCurrency(property.price_monthly)}</p>
                    <p className="text-[10px] text-stone-400 mt-0.5">Total: {formatCurrency(reservation.amount_total)}</p>
                  </div>
                </div>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-2">Rented Property</p>
                  <div className="flex items-center gap-4 p-3 bg-stone-50 border border-stone-200/60 rounded-xl">
                    <div className="w-12 h-12 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-2xl flex-shrink-0">🏠</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-bold text-stone-800 truncate">{property.name}</p>
                      <p className="text-[11px] text-stone-500 flex items-center gap-1 mt-0.5 truncate">
                        <MapPin size={11} className="text-stone-400 flex-shrink-0" />
                        {property.address}, {property.municipality}, {property.island} Island
                      </p>
                    </div>
                    <Button variant="default" size="sm" onClick={() => navigate(`/tenant/property/${property.id}`)} className="flex-shrink-0">
                      View details
                    </Button>
                  </div>
                </div>

                {reservation.notes && (
                  <div className="pt-2">
                    <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">Reservation Notes</p>
                    <p className="text-xs text-stone-600 bg-stone-50 p-3 rounded-lg border border-stone-100 leading-relaxed italic">
                      "{reservation.notes}"
                    </p>
                  </div>
                )}
              </div>
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
                <h4 className="text-[12px] font-semibold text-stone-800 mb-1">SmartStay Payments</h4>
                <p className="text-[11px] text-stone-500 leading-relaxed">
                  Rent payments can be recorded and tracked under the Reservations tab. Make sure to request a receipt for reference.
                </p>
              </Card>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}
