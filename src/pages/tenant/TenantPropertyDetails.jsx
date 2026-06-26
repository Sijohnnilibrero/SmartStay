import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Card, Badge, StarRating, OccupancyBar, Button } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { ArrowLeft, MapPin, CheckCircle2, BedDouble, X, MessageSquare, ExternalLink } from 'lucide-react'
import PropertyMap from '@/components/map/PropertyMap'
import { supabase } from '@/lib/supabase'

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
        var { data: owner } = await supabase.from('profiles').select('full_name, role').eq('id', prop.owner_id).single()
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
    }
  }, [selectedRoom])

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
    setBooking(true)
    createReservation({
      property_id: property.id,
      owner_id: property.owner_id,
      room_id: room.id,
      check_in: new Date().toISOString().split('T')[0],
      duration_months: 1,
      amount_total: room.price_monthly,
    }).then(function() {
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
            <h3 className="font-semibold text-stone-800">About this property</h3>
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
                        <p className="text-lg font-bold text-[--teal]">₱{r.price_monthly.toLocaleString()}<span className="text-[10px] font-normal text-stone-400">/mo</span></p>
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
              <div className="w-12 h-12 rounded-full bg-[#E1F5EE] text-[#0F6E56] font-bold text-lg flex items-center justify-center mb-2 shadow-sm">
                {(ownerProfile.full_name || '??').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <h3 className="font-semibold text-stone-800">Hosted by {ownerProfile.full_name}</h3>
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
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Room</p>
                  <p className="text-[14px] font-semibold text-stone-800">Room {selectedRoom.room_number}</p>
                  <p className="text-[11px] text-stone-400">Floor {selectedRoom.floor}</p>
                </div>
                <div className="p-3 bg-stone-50 rounded-lg">
                  <p className="text-[10px] uppercase tracking-wider text-stone-400">Monthly Rent</p>
                  <p className="text-[14px] font-semibold text-[--teal]">{formatCurrency(selectedRoom.price_monthly)}</p>
                </div>
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
            onTouchStart={e => touchStartX.current = e.targetTouches[0].clientX}
            onTouchMove={e => touchEndX.current = e.targetTouches[0].clientX}
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
    </div>
  )
}
