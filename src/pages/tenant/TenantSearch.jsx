import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button, Badge, FilterChip, Input, StarRating } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { Search, SlidersHorizontal, MapPin, BedDouble } from 'lucide-react'

const PROPERTY_IMAGES = [
  '/images/property_1.png',
  '/images/property_2.png',
  '/images/property_3.png',
]



export default function TenantSearch() {
  const navigate = useNavigate()
  const { fetchProperties } = useAuthStore()
  const [allProperties, setAllProperties] = useState([])
  const [query,     setQuery]     = useState('')
  const [island,    setIsland]    = useState('All')
  const [stayType,  setStayType]  = useState('Any')
  const [amenities, setAmenities] = useState([])
  const [sortBy,    setSortBy]    = useState('rating')

  var loadProperties = useCallback(function() {
    fetchProperties({ status: 'active' }).then(function(data) {
      setAllProperties(data)
    }).catch(function(err) {
      console.error('Failed to load properties:', err)
    })
  }, [fetchProperties])

  useFocusRefresh(loadProperties, [fetchProperties])

  const toggleAmenity = function(a) {
    setAmenities(function(prev) { return prev.includes(a) ? prev.filter(function(x) { return x !== a }) : [...prev, a] })
  }

  const filtered = useMemo(function() {
    var list = allProperties.filter(function(p) {
      var q = query.toLowerCase()
      if (q && !(p.name || '').toLowerCase().includes(q) && !(p.address || '').toLowerCase().includes(q)) return false
      if (stayType === 'Long-term (Monthly)' && !p.accepts_long_term) return false
      if (stayType === 'Transient (Daily)' && !p.accepts_transient) return false
      var activeAmenities = amenities.filter(function(a) { return a !== 'Any' })
      if (activeAmenities.length && !activeAmenities.every(function(a) { return (p.amenities || []).includes(a) })) return false
      return true
    })
    if (sortBy === 'rating')    list.sort(function(a, b) { return (b.rating || 0) - (a.rating || 0) })
    if (sortBy === 'occupancy') list.sort(function(a, b) { return ((a.available_rooms || 0)) - ((b.available_rooms || 0)) })
    return list
  }, [allProperties, query, stayType, amenities, sortBy])

  return (
    <div className="page-enter">
      <div className="px-6 pt-5 pb-1">
        <p className="font-bold text-2xl text-stone-800">Where do you want to stay?</p>
        <p className="text-sm text-stone-400 mt-0.5">{filtered.length} verified properties found</p>
      </div>

      <div className="p-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              className="pl-9"
              placeholder="Search by name, barangay, or municipality…"
              value={query}
              onChange={function(e) { setQuery(e.target.value) }}
            />
          </div>
          <select
            className="px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white text-stone-700 focus:outline-none focus:ring-2 focus:ring-teal-400/30"
            value={sortBy}
            onChange={function(e) { setSortBy(e.target.value) }}
          >
            <option value="rating">Sort: Best Rated</option>
            <option value="occupancy">Sort: Most Available</option>
          </select>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <div className="flex items-center gap-1.5 mr-2">
            <SlidersHorizontal size={13} className="text-stone-400" />
            <span className="text-[11px] text-stone-400 font-medium">Filters:</span>
          </div>
          {['Any', 'Long-term (Monthly)', 'Transient (Daily)'].map(function(s) {
            return <FilterChip key={s} label={s} active={stayType === s} onClick={function() { setStayType(s) }} />
          })}
          <div className="w-px bg-stone-200 mx-1" />
          {['Any', 'WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry', 'Garden', 'Furnished'].map(function(a) {
            return <FilterChip key={a} label={a} active={amenities.includes(a)} onClick={function() { toggleAmenity(a) }} />
          })}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-4xl mb-3">🏠</p>
            <p className="font-medium">No properties match your filters</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(function(p, idx) {
              return <PropertyCard key={p.id} property={p} idx={idx} onClick={function() { navigate(`/tenant/property/${p.id}`) }} onClickRooms={function() { navigate(`/tenant/property/${p.id}#rooms`) }} />
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function PropertyCard({ property: p, idx = 0, onClick, onClickRooms }) {
  var availColor = (p.available_rooms || 0) === 0 ? 'coral' : (p.available_rooms || 0) <= 2 ? 'amber' : 'teal'
  var availLabel = (p.available_rooms || 0) === 0 ? 'No Available Rooms' : (p.available_rooms || 0) + ' rooms left'
  var imgSrc = p.image_url || PROPERTY_IMAGES[idx % PROPERTY_IMAGES.length]

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-stone-200 overflow-hidden cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group"
    >
      {/* Image with overlay */}
      <div className="relative h-44 overflow-hidden bg-stone-100 flex items-center justify-center">
        {p.image_url ? (
          <img
            src={p.image_url}
            alt={p.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="text-stone-300 flex flex-col items-center justify-center gap-1.5 opacity-60">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
            <span className="text-[10px] font-semibold uppercase tracking-wider">No Photo</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        {/* Availability badge top-right */}
        <div className="absolute top-3 right-3">
          <Badge variant={availColor}>{availLabel}</Badge>
        </div>
        {/* Island badge bottom-left */}
        {p.island && (
          <div className="absolute bottom-3 left-3">
            <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
              {p.island}
            </span>
          </div>
        )}
        {/* Price bottom-right */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-white/95 backdrop-blur-sm text-[--teal] font-bold text-[12px] px-2.5 py-1 rounded-full shadow-sm">
            {p.price_monthly && p.accepts_long_term ? (
              <>{formatCurrency(p.price_monthly)}<span className="text-[10px] font-normal text-stone-500">/mo</span></>
            ) : p.price_daily && p.accepts_transient ? (
              <>{formatCurrency(p.price_daily)}<span className="text-[10px] font-normal text-stone-500">/day</span></>
            ) : (
              'Prices vary'
            )}
          </span>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-0.5">
          <p className="text-[14px] font-semibold text-stone-800 group-hover:text-[--teal] transition-colors truncate">
            {p.name}
          </p>
          <div className="flex items-center gap-1 bg-teal-50 text-teal-600 px-1.5 py-0.5 rounded flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
            <span className="text-[9px] font-bold tracking-wide uppercase">Verified</span>
          </div>
        </div>
        <p className="text-[11px] text-stone-400 flex items-center gap-1 mb-3">
          <MapPin size={10} className="flex-shrink-0" /> {p.address}
        </p>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <StarRating rating={p.rating || 0} size={10} />
            <span className="text-[10px] text-stone-400">{p.review_count || 0} reviews</span>
          </div>
          {p.municipality && (
            <span className="text-[10px] text-stone-500 bg-stone-100 px-2 py-0.5 rounded-full">{p.municipality}</span>
          )}
        </div>
        {/* Amenity chips */}
        {(p.amenities || []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {(p.amenities || []).slice(0, 3).map(function(a) {
              return <span key={a} className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-500 rounded-full border border-stone-100">{a}</span>
            })}
            {(p.amenities || []).length > 3 && (
              <span className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-400 rounded-full">+{p.amenities.length - 3}</span>
            )}
          </div>
        )}
        <button
          onClick={function(e) { e.stopPropagation(); if (onClickRooms) onClickRooms(); else onClick(e); }}
          className="mt-1 w-full text-[11px] text-[#0F6E56] font-medium flex items-center justify-center gap-1 py-2 rounded-xl bg-[#E1F5EE] hover:bg-[#d0ebe0] transition-colors"
        >
          <BedDouble size={11} /> View available rooms →
        </button>
      </div>
    </div>
  )
}
