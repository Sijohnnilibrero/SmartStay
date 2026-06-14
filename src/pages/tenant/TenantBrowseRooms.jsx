import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button, FilterChip } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { BedDouble, MapPin, Search, SlidersHorizontal } from 'lucide-react'

const PROPERTY_IMAGES = [
  '/images/property_1.png',
  '/images/property_2.png',
  '/images/property_3.png',
]

const MUNICIPALITIES = ['All', 'Basco', 'Ivana', 'Mahatao', 'Uyugan']
const BUDGETS = ['All', '₱1k–₱2k', '₱2k–₱3k', '₱3k+']

function budgetMatch(price, budget) {
  if (budget === 'All') return true
  if (budget === '₱1k–₱2k') return price >= 1000 && price <= 2000
  if (budget === '₱2k–₱3k') return price > 2000 && price <= 3000
  if (budget === '₱3k+') return price > 3000
  return true
}

export default function TenantBrowseRooms() {
  const navigate = useNavigate()
  const { fetchProperties, fetchRooms } = useAuthStore()
  const [allProperties, setAllProperties] = useState([])
  const [allRooms, setAllRooms] = useState([])
  const [query, setQuery] = useState('')
  const [island, setIsland] = useState('All')
  const [budget, setBudget] = useState('All')
  const [loading, setLoading] = useState(true)

  const loadData = useCallback(function() {
    setLoading(true)
    Promise.all([
      fetchProperties({ status: 'active' }),
    ]).then(function(results) {
      var properties = results[0] || []
      setAllProperties(properties)
      var propIds = properties.map(function(p) { return p.id })
      var roomsPromises = propIds.map(function(pid) {
        return fetchRooms(pid).then(function(r) { return r || [] })
      })
      return Promise.all(roomsPromises).then(function(roomsArrays) {
        var rooms = []
        roomsArrays.forEach(function(rArr, idx) {
          rArr.forEach(function(r) {
            rooms.push(Object.assign({}, r, { _property_id: propIds[idx] }))
          })
        })
        setAllRooms(rooms)
        setLoading(false)
      })
    }).catch(function(err) {
      console.error('Failed to load rooms:', err)
      setLoading(false)
    })
  }, [fetchProperties, fetchRooms])

  useFocusRefresh(loadData, [fetchProperties, fetchRooms])

  var propMap = useMemo(function() {
    var m = {}
    allProperties.forEach(function(p) { m[p.id] = p })
    return m
  }, [allProperties])

  var filtered = useMemo(function() {
    var list = allRooms.filter(function(r) {
      if (!r.is_available) return false
      var prop = propMap[r._property_id]
      if (!prop) return false
      var q = query.toLowerCase()
      if (q) {
        var matchName = (prop.name || '').toLowerCase().includes(q)
        var matchAddr = (prop.address || '').toLowerCase().includes(q)
        var matchRoom = (r.room_number || '').toLowerCase().includes(q)
        if (!matchName && !matchAddr && !matchRoom) return false
      }
      if (island !== 'All' && prop.island !== island) return false
      if (!budgetMatch(r.price_monthly, budget)) return false
      return true
    })
    return list
  }, [allRooms, propMap, query, island, budget])

  return (
    <div className="page-enter">
      <div className="px-6 pt-5 pb-1">
        <p className="font-bold text-2xl text-stone-800 flex items-center gap-2"><BedDouble size={22} className="text-[--teal]" /> Browse Rooms</p>
        <p className="text-sm text-stone-400 mt-0.5">{filtered.length} rooms available across all properties</p>
      </div>

      <div className="p-6">
        <div className="flex gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <input
              type="text"
              className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
              placeholder="Search by property name, address, or room number…"
              value={query}
              onChange={function(e) { setQuery(e.target.value) }}
            />
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-5">
          <div className="flex items-center gap-1.5 mr-2">
            <SlidersHorizontal size={13} className="text-stone-400" />
            <span className="text-[11px] text-stone-400 font-medium">Island:</span>
          </div>
          {ISLANDS.map(function(i) {
            return <FilterChip key={i} label={i} active={island === i} onClick={function() { setIsland(i) }} />
          })}
          <div className="w-px bg-stone-200 mx-1" />
          {BUDGETS.map(function(b) {
            return <FilterChip key={b} label={b} active={budget === b} onClick={function() { setBudget(b) }} />
          })}
        </div>

        {loading ? (
          <div className="text-center py-20 text-stone-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--teal] mx-auto mb-4" />
            <p className="text-sm">Loading rooms…</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <p className="text-4xl mb-3">🚪</p>
            <p className="font-medium">No rooms match your filters</p>
            <p className="text-sm mt-1">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(function(r, idx) {
              var prop = propMap[r._property_id]
              return (
                <RoomCard key={r.id} room={r} property={prop} idx={idx} onViewProperty={function() { navigate('/tenant/property/' + r._property_id) }} onReserve={function() { navigate('/tenant/property/' + r._property_id + '?room=' + r.id) }} />
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function RoomCard({ room: r, property: p, idx = 0, onViewProperty, onReserve }) {
  var hasRoomImg = r && r.image_urls && r.image_urls.length > 0;
  var imgSrc = hasRoomImg ? r.image_urls[0] : ((p && p.image_url) || PROPERTY_IMAGES[idx % PROPERTY_IMAGES.length]);
  return (
    <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">
      {/* Image header */}
      <div className="relative h-40 overflow-hidden">
        <img
          src={imgSrc}
          alt={p?.name || 'Room'}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {hasRoomImg && r.image_urls.length > 1 && (
          <div className="absolute top-3 left-3 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 z-10">
            <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> {r.image_urls.length} photos
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
        {/* Room badge top-left */}
        <div className="absolute top-3 left-3">
          <span className="bg-white/90 backdrop-blur-sm text-stone-700 font-bold text-[11px] px-2.5 py-1 rounded-full shadow-sm">
            Room {r.room_number}
          </span>
        </div>
        {/* Availability badge top-right */}
        <div className="absolute top-3 right-3">
          <Badge variant={r.is_available ? 'teal' : 'coral'}>{r.is_available ? 'Available' : 'Occupied'}</Badge>
        </div>
        {/* Price bottom-right */}
        <div className="absolute bottom-3 right-3">
          <span className="bg-white/95 backdrop-blur-sm text-[--teal] font-bold text-[13px] px-2.5 py-1 rounded-full shadow-sm">
            ₱{Number(r.price_monthly).toLocaleString()}<span className="text-[10px] font-normal text-stone-500">/mo</span>
          </span>
        </div>
        {/* Floor badge bottom-left */}
        <div className="absolute bottom-3 left-3">
          <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
            Floor {r.floor}
          </span>
        </div>
      </div>

      <div className="p-4">
        {p && (
          <div className="mb-3">
            <p className="text-[13px] font-semibold text-stone-800 truncate">{p.name}</p>
            <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
              <MapPin size={10} className="flex-shrink-0" /> {p.address}, {p.municipality}
            </p>
          </div>
        )}
        {r.amenities && r.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {r.amenities.slice(0, 3).map(function(a) {
              return <span key={a} className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-500 rounded-full border border-stone-100">{a}</span>
            })}
            {r.amenities.length > 3 && <span className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-400 rounded-full">+{r.amenities.length - 3}</span>}
          </div>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="flex-1 text-[11px]" onClick={onViewProperty}>View Property</Button>
          <Button size="sm" className="flex-1 text-[11px]" onClick={onReserve} disabled={!r.is_available}>
            {r.is_available ? 'Reserve' : 'Occupied'}
          </Button>
        </div>
      </div>
    </div>
  )
}
