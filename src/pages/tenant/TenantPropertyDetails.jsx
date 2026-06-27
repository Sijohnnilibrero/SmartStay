import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Badge, StarRating, OccupancyBar, Button, Input } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { ArrowLeft, MapPin, CheckCircle2, BedDouble, X, MessageSquare, ExternalLink } from 'lucide-react'
import PropertyMap from '@/components/map/PropertyMap'
import { supabase } from '@/lib/supabase'
import HomeownerProfileModal from '@/components/ui/HomeownerProfileModal'

export default function TenantPropertyDetails() {
  var idState = useParams()
  var id = idState.id
  var navigate = useNavigate()
  var searchParamsState = useSearchParams()
  var searchParams = searchParamsState[0]
  var fetchProperty = useAuthStore(function(s) { return s.fetchProperty })
  var fetchReviews = useAuthStore(function(s) { return s.fetchReviews })
  var fetchRooms = useAuthStore(function(s) { return s.fetchRooms })
  var storeUser = useAuthStore(function(s) { return s.user })
  var createReservation = useAuthStore(function(s) { return s.createReservation })
  var addToast = useAppStore(function(s) { return s.addToast })

  var propertyState = useState(null)
  var property = propertyState[0], setProperty = propertyState[1]
  var ownerProfileState = useState(null)
  var ownerProfile = ownerProfileState[0], setOwnerProfile = ownerProfileState[1]
  var [showOwnerModal, setShowOwnerModal] = useState(false)
  var reviewsState = useState([])
  var reviews = reviewsState[0], setReviews = reviewsState[1]
  var roomsState = useState([])
  var rooms = roomsState[0], setRooms = roomsState[1]
  var loadingState = useState(true)
  var loading = loadingState[0], setLoading = loadingState[1]
  var bookingState = useState(false)
  var booking = bookingState[0], setBooking = bookingState[1]
  var selectedRoomState = useState(null)
  var selectedRoom = selectedRoomState[0], setSelectedRoom = selectedRoomState[1]
  var [popupImgIdx, setPopupImgIdx] = useState(0)
  var [fullScreenImgIdx, setFullScreenImgIdx] = useState(null)
  var wasHiddenRef = useRef(false)
  var touchStartX = useRef(0)
  var touchEndX = useRef(0)

  var [stayType, setStayType] = useState('long_term')
  var [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0])
  var [checkOutDate, setCheckOutDate] = useState(new Date(Date.now() + 86400000).toISOString().split('T')[0])

  var loadProperty = useCallback(function() {
    setLoading(true)
    Promise.all([
      fetchProperty(id),
      fetchReviews(id),
      fetchRooms(id),
    ]).then(async function(results) {
      var prop = results[0]
      setProperty(prop)
      setReviews(results[1])
      setRooms(results[2] || [])
      
      if (prop && prop.owner_id) {
        var { data: owner } = await supabase.from('profiles').select('full_name, role, avatar_url, email, contact, municipality').eq('id', prop.owner_id).single()
        setOwnerProfile(owner)
      }

      setLoading(false)
    }).catch(function(err) {
      console.error('Failed to load property:', err)
      setLoading(false)
    })
  }, [id, fetchProperty, fetchReviews, fetchRooms])

  useEffect(function() { loadProperty() }, [loadProperty])

  useEffect(function() {
    if (!loading && window.location.hash === '#rooms') {
      setTimeout(() => {
        var el = document.getElementById('rooms')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    }
  }, [loading])

  useEffect(function() {
    var roomId = searchParams.get('room')
    if (roomId && rooms.length > 0) {
      var found = rooms.find(function(r) { return r.id === roomId })
      if (found) {
        setSelectedRoom(found)
        setPopupImgIdx(0)
      }
    }
  }, [searchParams, rooms])

  useEffect(function() {
    if (selectedRoom) {
      setPopupImgIdx(0)
      setFullScreenImgIdx(null)
      if (property) {
        setStayType(property.accepts_long_term ? 'long_term' : 'transient')
      }
    }
  }, [selectedRoom, property])

  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadProperty()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function() { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadProperty])

  function handleReserveRoom(room) {
    if (!storeUser || !property || !room) return
    if (!checkInDate) { addToast('Please select a check-in date.', 'error'); return; }
    if (stayType === 'transient' && !checkOutDate) { addToast('Please select a check-out date.', 'error'); return; }
    if (stayType === 'transient' && new Date(checkOutDate) <= new Date(checkInDate)) { addToast('Check-out must be after check-in.', 'error'); return; }

    setBooking(true)
    let total = room.price_monthly
    let payload = {
      property_id: property.id,
      owner_id: property.owner_id,
      room_id: room.id,
      check_in: checkInDate,
      stay_type: stayType
    }
    
    if (stayType === 'transient') {
      const days = Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)) || 1
      total = room.price_daily * days
      payload.check_out = checkOutDate
      payload.amount_total = total
    } else {
      payload.duration_months = 1
      payload.amount_total = room.price_monthly
    }

    createReservation(payload).then(function() {
      setSelectedRoom(null)
      addToast('Reservation request submitted for Room ' + room.room_number + '! Waiting for homeowner approval.', 'success')
      navigate('/tenant/reservations')
    }).catch(function(err) {
      addToast(err.message || 'Failed to create reservation.', 'error')
    }).finally(function() {
      setBooking(false)
    })
  }

  if (loading) return <div className="p-12 text-center text-stone-400">Loading property…</div>
  if (!property) {
    return (
      <div className="p-12 text-center text-stone-400">
        <p className="text-4xl mb-3">🏠</p>
        <p>Property not found.</p>
        <button className="mt-4 px-4 py-2 rounded-lg bg-[--teal] text-white text-sm" onClick={function() { navigate('/tenant/search') }}>Back to Search</button>
      </div>
    )
  }

  var occupancyPct = Math.round(((property.total_rooms - (property.available_rooms || 0)) / property.total_rooms) * 100)

  return (
    <div className="page-enter p-6 grid grid-cols-1 lg:grid-cols-3 gap-5">
      <div className="lg:col-span-2 space-y-4">
        <div className="h-52 rounded-2xl flex items-center justify-center text-7xl bg-[#E1F5EE]">🏠</div>

        <Card>
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-stone-800 text-lg">{property.name}</h3>
              <div className="flex items-center gap-1 bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
                <span className="text-[10px] font-bold tracking-wide uppercase">Verified Property</span>
              </div>
            </div>
            <Badge variant={(property.available_rooms || 0) === 0 ? 'coral' : 'teal'}>
              {(property.available_rooms || 0) === 0 ? 'No Available Rooms' : (property.available_rooms || 0) + ' rooms available'}
            </Badge>
          </div>
          <div className="p-4">
            <p className="text-sm text-stone-600 leading-relaxed">{property.description || 'No description provided.'}</p>
            <div className="flex items-center gap-1.5 mt-3 text-[12px] text-stone-500">
              <MapPin size={13} className="text-[--teal]" />
              {property.address}
            </div>
          </div>
        </Card>

        {property.amenities && property.amenities.length > 0 && (
          <Card>
            <div className="p-4 border-b border-stone-100"><h3 className="font-semibold text-stone-800">Amenities & Features</h3></div>
            <div className="p-4 grid grid-cols-2 md:grid-cols-3 gap-2">
              {property.amenities.map(function(a) {
                return (
                  <div key={a} className="flex items-center gap-2 text-[12px] text-stone-600">
                    <CheckCircle2 size={13} className="text-[--teal]" />
                    {a}
                  </div>
                )
              })}
            </div>
          </Card>
        )}

        <Card id="rooms">
          <div className="p-4 border-b border-stone-100"><h3 className="font-semibold text-stone-800">Available Rooms</h3></div>
          <div className="p-4">
            {rooms.length === 0 ? (
              <p className="text-sm text-stone-400">No rooms are currently available for this property.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {rooms.map(function(r) {
                  return (
                    <div key={r.id} className="border border-stone-100 rounded-xl overflow-hidden cursor-pointer hover:border-teal-300 hover:shadow-md transition-all group" onClick={function() { setSelectedRoom(r) }}>
                      {r.image_url ? (
                        <div className="h-32 overflow-hidden">
                          <img src={r.image_url} alt={'Room ' + r.room_number} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        </div>
                      ) : (
                        <div className="h-32 bg-stone-100 flex items-center justify-center text-stone-400">
                          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><line x1="3" x2="21" y1="9" y2="9"/><line x1="9" x2="9" y1="21" y2="9"/></svg>
                        </div>
                      )}
                      <div className="p-3">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[13px] font-semibold text-stone-800">Room {r.room_number}</p>
                          <span className={'text-[10px] px-2 py-0.5 rounded-full font-medium ' + (r.is_available ? 'bg-teal-100 text-teal-700' : (r.status === 'ongoing_transaction' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'))}>
                            {r.is_available ? 'Available' : (r.status === 'ongoing_transaction' ? 'Ongoing Transaction' : 'Occupied')}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-400 mb-2">Floor {r.floor}</p>
                        <div className="mb-2">
                          {property.accepts_long_term && r.price_monthly > 0 && (
                            <p className="text-lg font-bold text-[--teal]">₱{r.price_monthly.toLocaleString()}<span className="text-[10px] font-normal text-stone-400">/mo</span></p>
                          )}
                          {property.accepts_transient && r.price_daily > 0 && (
                            <p className="text-lg font-bold text-teal-600">₱{r.price_daily.toLocaleString()}<span className="text-[10px] font-normal text-stone-400">/day</span></p>
                          )}
                        </div>
                        {r.amenities && r.amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {r.amenities.slice(0, 4).map(function(a) {
                              return <span key={a} className="text-[10px] px-1.5 py-0.5 bg-stone-50 text-stone-500 rounded border border-stone-100">{a}</span>
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">Reviews</h3>
            <span className="text-[12px] text-stone-400">{reviews.length} reviews</span>
          </div>
          <div className="p-4">
            {reviews.length === 0 ? (
              <p className="text-sm text-stone-400">No reviews yet for this property.</p>
            ) : (
              <div className="space-y-3">
                {reviews.map(function(r) {
                  return (
                    <div key={r.id} className="py-3 border-b border-stone-50 last:border-0">
                      <div className="flex items-center gap-2 mb-1.5">
                        <div className="w-6 h-6 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[10px] font-semibold text-[#0F6E56]">
                          {(r.tenant_id || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <StarRating rating={r.rating || 0} size={10} />
                        <span className="text-[10px] text-stone-400 ml-auto">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</span>
                      </div>
                      {r.text && <p className="text-[12px] text-stone-500 leading-relaxed">{r.text}</p>}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card>
          <div className="p-4">
            <p className="font-bold text-xl text-[--teal] mb-1">Prices vary by room</p>
            <p className="text-[11px] text-stone-400 mb-4">View available rooms to see pricing</p>
            <div className="flex items-center gap-2 p-3 bg-[#E1F5EE] rounded-lg mb-3">
              <BedDouble size={16} className="text-[#0F6E56]" />
              <p className="text-[12px] text-[#0F6E56] font-medium">Select an available room to reserve it</p>
            </div>
            <p className="text-[11px] text-stone-400">Select an available room from the list to submit a reservation request. The homeowner will review and approve your request.</p>
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-stone-100"><h3 className="font-semibold text-stone-800">Availability</h3></div>
          <div className="p-4">
            <OccupancyBar
              label={property.total_rooms - (property.available_rooms || 0) + '/' + property.total_rooms + ' rooms unavailable'}
              value={occupancyPct}
              color={occupancyPct > 80 ? '#D85A30' : '#1D9E75'}
            />
          </div>
        </Card>

        <Card>
          <div className="p-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Location</h3>
            <p className="text-[11px] text-stone-400 mt-0.5">{property.municipality}, {property.island} Island</p>
          </div>
          <div className="p-3">
            {property.latitude && property.longitude ? (
              <PropertyMap
                mode="view"
                lat={parseFloat(property.latitude)}
                lng={parseFloat(property.longitude)}
                height="200px"
              />
            ) : (
              <div className="h-28 bg-[#E1F5EE] rounded-lg flex items-center justify-center text-[12px] text-[#0F6E56] font-medium">
                📍 {property.municipality}, {property.island} Island
              </div>
            )}
          </div>
        </Card>

        {ownerProfile && (
          <Card>
            <div className="p-5 flex flex-col items-center justify-center text-center">
              <div 
                className={`w-14 h-14 rounded-full flex items-center justify-center mb-2 shadow-sm relative group cursor-pointer overflow-hidden border-2 border-white ${ownerProfile.avatar_url ? '' : 'bg-[#E1F5EE] text-[#0F6E56] font-bold text-lg'}`}
                onClick={() => setShowOwnerModal(true)}
              >
                {ownerProfile.avatar_url ? (
                  <img src={ownerProfile.avatar_url} alt={ownerProfile.full_name} className="w-full h-full object-cover" />
                ) : (
                  (ownerProfile.full_name || '??').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
                )}
                <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <ExternalLink size={16} className="text-white" />
                </div>
              </div>
              <h3 className="font-semibold text-stone-800 hover:text-teal-600 cursor-pointer transition-colors" onClick={() => setShowOwnerModal(true)}>
                Hosted by {ownerProfile.full_name}
              </h3>
              <p className="text-[11px] text-stone-500 mb-4 px-2">Have a question before you book? Send the host a message.</p>
              {storeUser?.role !== 'admin' && (
                <Button 
                  variant="primary" 
                  className="w-full justify-center gap-1.5 shadow-sm hover:shadow-md transition-all"
                  onClick={() => navigate('/tenant/messages', { 
                    state: { autoSelectUser: { id: property.owner_id, full_name: ownerProfile.full_name, role: 'owner' } } 
                  })}
                >
                  Contact Host <MessageSquare size={14} />
                </Button>
              )}
            </div>
          </Card>
        )}
      </div>

      {selectedRoom && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={function() { setSelectedRoom(null) }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full mx-4 overflow-hidden" onClick={function(e) { e.stopPropagation() }}>
            <div className="p-5 border-b border-stone-100 flex items-center justify-between">
              <h3 className="font-semibold text-stone-800 text-lg">Reserve Room {selectedRoom.room_number}</h3>
              <button className="p-1 rounded-lg hover:bg-stone-100" onClick={function() { setSelectedRoom(null) }}><X size={18} className="text-stone-400" /></button>
            </div>

            {/* Image Carousel */}
            {selectedRoom.image_urls && selectedRoom.image_urls.length > 0 && (
              <div className="relative h-48 bg-stone-100 w-full group cursor-pointer" onClick={() => setFullScreenImgIdx(popupImgIdx)}>
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors z-10 flex items-center justify-center">
                  <div className="bg-black/50 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
                  </div>
                </div>
                <img src={selectedRoom.image_urls[popupImgIdx]} alt="Room Photo" className="w-full h-full object-cover" />
                {selectedRoom.image_urls.length > 1 && (
                  <>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPopupImgIdx(i => i === 0 ? selectedRoom.image_urls.length - 1 : i - 1) }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                    </button>
                    <button type="button" onClick={(e) => { e.stopPropagation(); setPopupImgIdx(i => (i + 1) % selectedRoom.image_urls.length) }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-20">
                      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 bg-black/40 px-2 py-1 rounded-full z-20">
                      {selectedRoom.image_urls.map((_, i) => (
                        <div key={i} className={`w-1.5 h-1.5 rounded-full ${i === popupImgIdx ? 'bg-white' : 'bg-white/40'}`} />
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}

            <div className="p-5 space-y-4">
              <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-xl">
                <div className="w-12 h-12 rounded-lg bg-[#E1F5EE] flex items-center justify-center text-2xl">🏠</div>
                <div>
                  <p className="text-[13px] font-semibold text-stone-800">{property.name}</p>
                  <p className="text-[11px] text-stone-500">{property.address}</p>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-stone-50 rounded-lg flex flex-col justify-center">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Room</p>
                  <p className="text-[14px] font-semibold text-stone-800">Room {selectedRoom.room_number}</p>
                  <p className="text-[11px] text-stone-400">Floor {selectedRoom.floor}</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg flex flex-col gap-2">
                  {property.accepts_long_term && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400">Monthly Rent</p>
                      <p className="text-[14px] font-semibold text-[--teal]">{formatCurrency(selectedRoom.price_monthly)}</p>
                    </div>
                  )}
                  {property.accepts_transient && selectedRoom.price_daily > 0 && (
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-stone-400 text-teal-600">Daily Rate</p>
                      <p className="text-[14px] font-semibold text-teal-600">{formatCurrency(selectedRoom.price_daily)}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Booking Dates section */}
              <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 space-y-3">
                {property.accepts_long_term && property.accepts_transient && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Stay Type</label>
                    <div className="flex bg-stone-200/50 p-1 rounded-lg">
                      <button type="button" onClick={() => setStayType('long_term')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${stayType === 'long_term' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}>Long-term (Monthly)</button>
                      <button type="button" onClick={() => setStayType('transient')} className={`flex-1 py-1.5 text-xs font-medium rounded-md transition-all ${stayType === 'transient' ? 'bg-white shadow-sm text-stone-800' : 'text-stone-500 hover:text-stone-700'}`}>Short-term (Daily)</button>
                    </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-3">
                  <div className={stayType === 'long_term' ? 'col-span-2' : ''}>
                    <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Check-in Date</label>
                    <Input type="date" value={checkInDate} onChange={(e) => setCheckInDate(e.target.value)} min={new Date().toISOString().split('T')[0]} required className="bg-white" />
                  </div>
                  {stayType === 'transient' && (
                    <div>
                      <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Check-out Date</label>
                      <Input type="date" value={checkOutDate} onChange={(e) => setCheckOutDate(e.target.value)} min={checkInDate || new Date().toISOString().split('T')[0]} required className="bg-white" />
                    </div>
                  )}
                </div>

                {stayType === 'transient' && checkInDate && checkOutDate && new Date(checkOutDate) > new Date(checkInDate) && (
                  <div className="pt-2 border-t border-stone-200 flex justify-between items-center">
                    <p className="text-xs text-stone-500">Total for {Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24))} day(s)</p>
                    <p className="font-bold text-teal-700">
                      {formatCurrency(selectedRoom.price_daily * Math.ceil((new Date(checkOutDate) - new Date(checkInDate)) / (1000 * 60 * 60 * 24)))}
                    </p>
                  </div>
                )}
              </div>
              {selectedRoom.amenities && selectedRoom.amenities.length > 0 && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-2">Room Amenities</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedRoom.amenities.map(function(a) {
                      return <span key={a} className="text-[10px] px-2 py-1 bg-[#E1F5EE] text-[#0F6E56] rounded-full">{a}</span>
                    })}
                  </div>
                </div>
              )}
              {selectedRoom.notes && (
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-stone-400 mb-1">Notes</p>
                  <p className="text-[12px] text-stone-600 italic">{selectedRoom.notes}</p>
                </div>
              )}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-[11px] text-amber-700">Your reservation request will be sent to the homeowner for approval. You will be notified once it is reviewed.</p>
              </div>
            </div>
            <div className="p-5 border-t border-stone-100 flex gap-3">
              <Button variant="ghost" className="flex-1" onClick={function() { setSelectedRoom(null) }} disabled={booking}>Cancel</Button>
              <Button className="flex-1" onClick={function() { handleReserveRoom(selectedRoom) }} disabled={booking || !selectedRoom.is_available}>
                {booking ? 'Submitting…' : 'Confirm Reservation'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Lightbox / Full screen gallery */}
      {selectedRoom && fullScreenImgIdx !== null && selectedRoom.image_urls && createPortal(
        <div className="fixed inset-0 bg-black/95 flex flex-col items-center justify-center z-[100]" onClick={() => setFullScreenImgIdx(null)}>
          <button className="absolute top-4 sm:top-8 right-4 sm:right-8 text-white/70 hover:text-white p-2 rounded-full bg-white/10 hover:bg-white/20 transition-all z-10" onClick={() => setFullScreenImgIdx(null)}>
            <X size={24} />
          </button>
          
          <div className="relative w-full max-w-5xl px-0 sm:px-12 h-[100vh] flex items-center justify-center" 
            onClick={e => e.stopPropagation()}
            onTouchStart={e => { touchStartX.current = e.targetTouches[0].clientX }}
            onTouchMove={e => { touchEndX.current = e.targetTouches[0].clientX }}
            onTouchEnd={e => {
              if (!touchStartX.current || !touchEndX.current) return
              const distance = touchStartX.current - touchEndX.current
              if (distance > 50) {
                setFullScreenImgIdx(i => (i + 1) % selectedRoom.image_urls.length)
              } else if (distance < -50) {
                setFullScreenImgIdx(i => i === 0 ? selectedRoom.image_urls.length - 1 : i - 1)
              }
              touchStartX.current = 0
              touchEndX.current = 0
            }}
          >
            <img 
              key={fullScreenImgIdx} 
              src={selectedRoom.image_urls[fullScreenImgIdx]} 
              alt="Room Fullscreen" 
              className="max-w-full max-h-[80vh] object-contain sm:rounded-lg pointer-events-none quick-fade" 
            />
            
            {selectedRoom.image_urls.length > 1 && (
              <>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFullScreenImgIdx(i => i === 0 ? selectedRoom.image_urls.length - 1 : i - 1) }}
                  className="hidden sm:block absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                </button>
                <button type="button" onClick={(e) => { e.stopPropagation(); setFullScreenImgIdx(i => (i + 1) % selectedRoom.image_urls.length) }}
                  className="hidden sm:block absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-all backdrop-blur-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                </button>
              </>
            )}
          </div>
          
          {selectedRoom.image_urls.length > 1 && (
            <div className="absolute bottom-6 sm:bottom-12 left-1/2 -translate-x-1/2 flex gap-2 overflow-x-auto max-w-[90vw] px-4 py-2 pointer-events-auto" onClick={e => e.stopPropagation()}>
              {selectedRoom.image_urls.map((url, i) => (
                <button key={i} onClick={() => setFullScreenImgIdx(i)}
                  className={`relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === fullScreenImgIdx ? 'border-white opacity-100 scale-105' : 'border-transparent opacity-50 hover:opacity-80'}`}>
                  <img src={url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>,
        document.body
      )}

      {/* Owner Profile Modal */}
      {showOwnerModal && ownerProfile && (
        <HomeownerProfileModal
          owner={{
            owner_name: ownerProfile.full_name,
            owner_avatar: ownerProfile.avatar_url,
            owner_email: ownerProfile.email,
            owner_contact: ownerProfile.contact,
            owner_municipality: ownerProfile.municipality
          }}
          onClose={() => setShowOwnerModal(false)}
        />
      )}
    </div>
  )
}
