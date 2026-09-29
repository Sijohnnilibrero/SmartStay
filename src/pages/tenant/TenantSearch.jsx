import { useState, useMemo, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { Badge, FilterChip, Input, StarRating } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { Search, MapPin, BedDouble, MapPinned, Award, Sparkles, RotateCcw, Home as HomeIcon, CheckCircle2, SlidersHorizontal, X } from 'lucide-react'

const PROPERTY_IMAGES = [
  '/images/property_1.png',
  '/images/property_2.png',
  '/images/property_3.png',
]

const MUNICIPALITIES = ['All', 'Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Sabtang', 'Itbayat']
const RATING_FILTERS = [
  { label: 'All Ratings', value: 0 },
  { label: '4.5+ ⭐', value: 4.5 },
  { label: '4.0+ ⭐', value: 4.0 },
  { label: '3.5+ ⭐', value: 3.5 },
]

// Modern value amenities (replacing basic water/electric with actual selling points)
const AMENITY_OPTIONS = [
  { label: 'WiFi', color: 'blue', icon: '📶' },
  { label: 'Air Conditioning', color: 'blue', icon: '❄️' },
  { label: 'Kitchen / Cooking', color: 'amber', icon: '🍳' },
  { label: 'Laundry', color: 'purple', icon: '🧺' },
  { label: 'Security / CCTV', color: 'emerald', icon: '🛡️' },
  { label: 'Parking', color: 'purple', icon: '🅿️' },
  { label: 'Backup Power', color: 'amber', icon: '🔋' },
]

export default function TenantSearch() {
  const navigate = useNavigate()
  const { fetchProperties } = useAuthStore()
  const [allProperties, setAllProperties] = useState([])
  const [query, setQuery] = useState('')
  const [municipality, setMunicipality] = useState('All')
  const [minRating, setMinRating] = useState(0)
  const [stayType, setStayType] = useState('Any')
  const [amenities, setAmenities] = useState([])
  const [sortBy, setSortBy] = useState('rating_desc') // Default: Highest Rated / Satisfaction
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const loadProperties = useCallback(function() {
    fetchProperties({ status: 'active' }).then(function(data) {
      setAllProperties(data)
    }).catch(function(err) {
      console.error('Failed to load properties:', err)
    })
  }, [fetchProperties])

  useFocusRefresh(loadProperties, [fetchProperties])

  const toggleAmenity = function(a) {
    setAmenities(function(prev) {
      return prev.includes(a) ? prev.filter(function(x) { return x !== a }) : [...prev, a]
    })
  }

  const activeFilterCount = useMemo(() => {
    let count = 0
    if (municipality !== 'All') count++
    if (minRating > 0) count++
    if (stayType !== 'Any') count++
    if (amenities.length > 0) count += amenities.length
    return count
  }, [municipality, minRating, stayType, amenities])

  const hasActiveFilters = useMemo(() => {
    return query.trim() !== '' || activeFilterCount > 0
  }, [query, activeFilterCount])

  const resetAllFilters = () => {
    setQuery('')
    setMunicipality('All')
    setMinRating(0)
    setStayType('Any')
    setAmenities([])
    setSortBy('rating_desc')
  }

  // Calculate live counts for municipalities
  const municipalityCounts = useMemo(() => {
    const counts = { All: allProperties.length }
    MUNICIPALITIES.forEach((m) => {
      if (m !== 'All') {
        counts[m] = allProperties.filter((p) => p.municipality === m).length
      }
    })
    return counts
  }, [allProperties])

  // Sorting helper
  const sortList = useCallback((list) => {
    const copy = [...list]
    if (sortBy === 'rating_desc') {
      copy.sort(function(a, b) {
        var diff = (b.rating || 0) - (a.rating || 0)
        if (diff !== 0) return diff
        return (b.review_count || 0) - (a.review_count || 0)
      })
    } else if (sortBy === 'price_asc') {
      copy.sort(function(a, b) {
        var pA = a.price_monthly || a.price_daily || 999999
        var pB = b.price_monthly || b.price_daily || 999999
        return pA - pB
      })
    } else if (sortBy === 'price_desc') {
      copy.sort(function(a, b) {
        var pA = a.price_monthly || a.price_daily || 0
        var pB = b.price_monthly || b.price_daily || 0
        return pB - pA
      })
    } else if (sortBy === 'occupancy') {
      copy.sort(function(a, b) {
        return (b.available_rooms || 0) - (a.available_rooms || 0)
      })
    }
    return copy
  }, [sortBy])

  // Non-destructive Two-Tier Partitioning
  const { exactMatches, otherOptions } = useMemo(() => {
    if (!allProperties.length) return { exactMatches: [], otherOptions: [] }

    const exact = []
    const other = []

    allProperties.forEach((p) => {
      // Check query match
      const q = query.trim().toLowerCase()
      let matchesQuery = true
      if (q) {
        const matchName = (p.name || '').toLowerCase().includes(q)
        const matchAddr = (p.address || '').toLowerCase().includes(q)
        const matchMuni = (p.municipality || '').toLowerCase().includes(q)
        const matchOwner = (p.owner_name || '').toLowerCase().includes(q)
        matchesQuery = matchName || matchAddr || matchMuni || matchOwner
      }

      // Check Location
      const matchesLocation = municipality === 'All' || p.municipality === municipality

      // Check Rating
      const matchesRating = minRating === 0 || (p.rating || 0) >= minRating

      // Check Stay Type
      let matchesStay = true
      if (stayType === 'Long-term (Monthly)' && !p.accepts_long_term) matchesStay = false
      if (stayType === 'Transient (Daily)' && !p.accepts_transient) matchesStay = false

      // Check Amenities (exact matches must contain all selected amenities)
      let matchesAmenities = true
      if (amenities.length > 0) {
        matchesAmenities = amenities.every((a) => {
          const propA = p.amenities || []
          return propA.some((item) => item.toLowerCase().includes(a.toLowerCase()) || a.toLowerCase().includes(item.toLowerCase()))
        })
      }

      if (matchesQuery && matchesLocation && matchesRating && matchesStay && matchesAmenities) {
        exact.push(p)
      } else {
        if (matchesQuery) {
          other.push(p)
        }
      }
    })

    return {
      exactMatches: sortList(exact),
      otherOptions: sortList(other),
    }
  }, [allProperties, query, municipality, minRating, stayType, amenities, sortList])

  return (
    <div className="page-enter">
      {/* ── Compact Sticky Search & Filter Toolbar ── */}
      <div 
        className="sticky top-14 z-20 px-3 sm:px-6 py-2.5 backdrop-blur-md border-b space-y-2 transition-colors shadow-sm"
        style={{ backgroundColor: 'var(--surface-header)', borderColor: 'var(--border-default)' }}
      >
        {/* Row 1: Search Input + Sorting Dropdown + Mobile Filter Button + Reset */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input
              className="pl-9 h-9 text-xs sm:text-sm bg-white dark:bg-stone-900 border-stone-200 dark:border-white/10 rounded-xl"
              placeholder="Search by name, landlord, address…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          {/* Sort Dropdown */}
          <select
            className="h-9 px-2.5 text-xs font-medium rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-teal-500/30 cursor-pointer shadow-sm hidden sm:block"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="rating_desc">⭐ Best Rated</option>
            <option value="occupancy">🛏️ Most Available</option>
            <option value="price_asc">🏷️ Price: Low</option>
            <option value="price_desc">💎 Price: High</option>
          </select>

          {/* Mobile Filter Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileFiltersOpen(true)}
            className={`h-9 px-3 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 cursor-pointer shadow-sm md:hidden ${
              activeFilterCount > 0
                ? 'bg-teal-600 border-teal-600 text-white shadow-teal-900/20'
                : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-white/10 text-stone-700 dark:text-stone-200'
            }`}
          >
            <SlidersHorizontal size={13} />
            <span>Filters</span>
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-white text-teal-800 text-[10px] font-black flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>

          {/* Reset Button */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-9 px-2.5 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/60 transition-colors flex items-center gap-1 flex-shrink-0 cursor-pointer shadow-sm"
              title="Reset all filters"
            >
              <RotateCcw size={12} />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>

        {/* Row 2: Sleek Single-Line Horizontal Scroll for Municipalities */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-1 px-1">
          <div className="flex items-center gap-1 mr-1 flex-shrink-0">
            <MapPinned size={13} className="text-teal-600 dark:text-teal-400" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Location:</span>
          </div>
          {MUNICIPALITIES.map((m) => (
            <div key={m} className="flex-shrink-0">
              <FilterChip
                label={m}
                color="teal"
                count={municipalityCounts[m]}
                active={municipality === m}
                onClick={() => setMunicipality(m)}
              />
            </div>
          ))}
        </div>

        {/* Row 3 (Desktop Only): Rating, Stay Type, and Value Amenities */}
        <div className="hidden md:flex flex-wrap gap-1.5 items-center pt-1 border-t border-stone-100 dark:border-white/5">
          {/* Rating Filters */}
          <div className="flex items-center gap-1 mr-1">
            <Award size={13} className="text-amber-500" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">Rating:</span>
          </div>
          {RATING_FILTERS.map((r) => (
            <FilterChip
              key={r.label}
              label={r.label}
              color="amber"
              active={minRating === r.value}
              onClick={() => setMinRating(r.value)}
            />
          ))}

          <div className="w-px h-3.5 bg-stone-300 dark:bg-white/10 mx-1" />

          {/* Stay Type */}
          {[
            { label: 'Any', color: 'teal' },
            { label: 'Long-term (Monthly)', color: 'teal' },
            { label: 'Transient (Daily)', color: 'amber' },
          ].map((s) => (
            <FilterChip
              key={s.label}
              label={s.label}
              color={s.color}
              active={stayType === s.label}
              onClick={() => setStayType(s.label)}
            />
          ))}

          <div className="w-px h-3.5 bg-stone-300 dark:bg-white/10 mx-1" />

          {/* Modern Value Amenities */}
          {AMENITY_OPTIONS.map((a) => (
            <FilterChip
              key={a.label}
              label={a.label}
              color={a.color}
              active={amenities.includes(a.label)}
              onClick={() => toggleAmenity(a.label)}
            />
          ))}
        </div>
      </div>

      {/* ── Main Results Container (Two-Tier Non-Destructive Layout) ── */}
      <div className="p-3.5 sm:p-6 space-y-6">
        
        {/* Tier 1: Exact Matches */}
        {exactMatches.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-teal-100 dark:bg-teal-950/80 text-teal-700 dark:text-teal-300">
                  <Sparkles size={15} />
                </div>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-stone-900 dark:text-stone-100">
                    {hasActiveFilters ? 'Best Matches for Your Filters' : 'Featured Boarding Houses'}
                  </h2>
                  <p className="text-[11px] text-stone-500 dark:text-stone-400">
                    {exactMatches.length} {exactMatches.length === 1 ? 'boarding house meets' : 'boarding houses meet'} your criteria
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {exactMatches.map((p, idx) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  idx={idx}
                  isBestMatch={hasActiveFilters}
                  onClick={() => navigate(`/tenant/property/${p.id}`)}
                  onClickRooms={() => navigate(`/tenant/property/${p.id}#rooms`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Informative fallback if 0 exact matches */}
        {hasActiveFilters && exactMatches.length === 0 && otherOptions.length > 0 && (
          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 flex items-start gap-3">
            <span className="text-lg">💡</span>
            <div className="space-y-0.5 flex-1">
              <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">
                No boarding house matched all selected filters simultaneously.
              </p>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80">
                We've kept all other verified boarding houses visible below so you don't miss out on great options!
              </p>
            </div>
            <button
              onClick={resetAllFilters}
              className="text-xs font-bold text-amber-900 dark:text-amber-200 underline hover:no-underline cursor-pointer flex-shrink-0"
            >
              Reset
            </button>
          </div>
        )}

        {/* Tier 2: Other Available Stays (Never Left Behind) */}
        {hasActiveFilters && otherOptions.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-stone-200 dark:border-white/10">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                <HomeIcon size={15} />
              </div>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-stone-800 dark:text-stone-200">
                  Other Available Stays in Batanes
                </h2>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  {otherOptions.length} other verified properties you might also like
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 opacity-95">
              {otherOptions.map((p, idx) => (
                <PropertyCard
                  key={p.id}
                  property={p}
                  idx={idx + exactMatches.length}
                  isBestMatch={false}
                  onClick={() => navigate(`/tenant/property/${p.id}`)}
                  onClickRooms={() => navigate(`/tenant/property/${p.id}#rooms`)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Total Empty State */}
        {exactMatches.length === 0 && otherOptions.length === 0 && (
          <div className="text-center py-16 text-stone-400 dark:text-stone-500 space-y-3">
            <p className="text-4xl">🏠</p>
            <p className="font-bold text-stone-700 dark:text-stone-300">No properties found matching "{query}"</p>
            <p className="text-xs">Try searching by a different name, barangay, or municipality</p>
            <button
              onClick={resetAllFilters}
              className="mt-2 px-4 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              View All Properties
            </button>
          </div>
        )}

      </div>

      {/* ── Mobile Filter Modal (Top-Aligned Portal to document.body) ── */}
      {mobileFiltersOpen && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 animate-fadeIn">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileFiltersOpen(false)}
          />

          {/* Modal Container - Compact & Top/Center Aligned */}
          <div className="relative w-full max-w-sm bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-white/15 shadow-2xl flex flex-col z-10 overflow-hidden animate-scaleUp">
            
            {/* Modal Header */}
            <div className="px-4 py-3 border-b border-stone-200 dark:border-white/10 flex items-center justify-between bg-stone-50/70 dark:bg-stone-800/70">
              <div className="flex items-center gap-2">
                <SlidersHorizontal size={15} className="text-teal-600 dark:text-teal-400" />
                <h3 className="font-bold text-sm text-stone-900 dark:text-white">
                  Filter & Customize
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1.5 rounded-full hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-400 hover:text-stone-700 dark:hover:text-white transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-3.5 space-y-3">
              
              {/* Stay Type */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Stay Type
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { label: 'Any', color: 'teal' },
                    { label: 'Long-term (Monthly)', color: 'teal' },
                    { label: 'Transient (Daily)', color: 'amber' },
                  ].map((s) => (
                    <FilterChip
                      key={s.label}
                      label={s.label}
                      color={s.color}
                      active={stayType === s.label}
                      onClick={() => setStayType(s.label)}
                    />
                  ))}
                </div>
              </div>

              {/* Minimum Satisfaction Rating */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Minimum Rating
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {RATING_FILTERS.map((r) => (
                    <FilterChip
                      key={r.label}
                      label={r.label}
                      color="amber"
                      active={minRating === r.value}
                      onClick={() => setMinRating(r.value)}
                    />
                  ))}
                </div>
              </div>

              {/* Desired Amenities - Compact 3-Column Grid */}
              <div className="space-y-1">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                  Amenities
                </label>
                <div className="grid grid-cols-3 gap-1.5">
                  {AMENITY_OPTIONS.map((a) => {
                    const isSelected = amenities.includes(a.label)
                    return (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => toggleAmenity(a.label)}
                        className={`py-1.5 px-1.5 rounded-xl border text-[10px] font-semibold text-center flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer select-none ${
                          isSelected
                            ? 'bg-teal-50 dark:bg-teal-950/80 border-teal-500 text-teal-900 dark:text-teal-200 ring-1 ring-teal-500/30'
                            : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-700/80 text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800'
                        }`}
                      >
                        <span className="text-sm">{a.icon}</span>
                        <span className="truncate w-full leading-tight text-[10px]">{a.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-3 border-t border-stone-200 dark:border-white/10 bg-stone-50 dark:bg-stone-800/50 flex gap-2">
              <button
                type="button"
                onClick={resetAllFilters}
                className="flex-1 py-2 rounded-xl border border-stone-300 dark:border-stone-700 text-stone-700 dark:text-stone-300 text-xs font-bold hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer"
              >
                Clear All
              </button>
              <button
                type="button"
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-[2] py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-900/20 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Apply Filters ({exactMatches.length + otherOptions.length})</span>
              </button>
            </div>

          </div>
        </div>,
        document.body
      )}

    </div>
  )
}

function PropertyCard({ property: p, idx = 0, isBestMatch = false, onClick, onClickRooms }) {
  var availColor = (p.available_rooms || 0) === 0 ? 'coral' : (p.available_rooms || 0) <= 2 ? 'amber' : 'teal'
  var availLabel = (p.available_rooms || 0) === 0 ? 'No Available Rooms' : (p.available_rooms || 0) + ' rooms left'
  var imgSrc = p.image_url || PROPERTY_IMAGES[idx % PROPERTY_IMAGES.length]

  return (
    <div
      onClick={onClick}
      className={`bg-white dark:bg-stone-900 rounded-2xl border ${
        isBestMatch ? 'border-teal-500/50 shadow-md ring-1 ring-teal-500/20' : 'border-stone-200/90 dark:border-white/10'
      } overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all duration-200 group flex flex-col justify-between`}
    >
      <div>
        {/* Image with overlay */}
        <div className="relative h-44 overflow-hidden bg-stone-100 dark:bg-stone-800 flex items-center justify-center">
          {p.image_url ? (
            <img
              src={p.image_url}
              alt={p.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="text-stone-300 dark:text-stone-600 flex flex-col items-center justify-center gap-1.5 opacity-60">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span className="text-[10px] font-semibold uppercase tracking-wider">No Photo</span>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          
          {/* Availability badge top-right */}
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            {isBestMatch && (
              <span className="bg-emerald-600/95 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white/20">
                <CheckCircle2 size={10} /> Matched
              </span>
            )}
            {(p.available_rooms || 0) === 0 ? (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-red-600/95 dark:bg-rose-600/90 text-white !text-white shadow-md shadow-red-950/25 backdrop-blur-md border border-red-400/40"
                style={{ color: '#ffffff' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />
                No Available Rooms
              </span>
            ) : (p.available_rooms || 0) <= 2 ? (
              <span 
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/95 dark:bg-amber-600/90 text-white !text-white shadow-md shadow-amber-950/20 backdrop-blur-md border border-amber-300/40"
                style={{ color: '#ffffff' }}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0 animate-pulse" />
                {p.available_rooms} {p.available_rooms === 1 ? 'room' : 'rooms'} left
              </span>
            ) : (
              <span 
                className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-600/95 dark:bg-emerald-600/90 text-white !text-white shadow-md shadow-emerald-950/20 backdrop-blur-md border border-emerald-400/30"
                style={{ color: '#ffffff' }}
              >
                {p.available_rooms} rooms left
              </span>
            )}
          </div>

          {/* Island / Municipality badge bottom-left */}
          <div className="absolute bottom-3 left-3 flex items-center gap-1">
            {p.municipality && (
              <span className="bg-white dark:bg-stone-950 text-stone-800 dark:text-stone-100 font-bold text-[11px] px-2.5 py-1 rounded-full shadow-lg border border-stone-200/80 dark:border-white/20 ring-1 ring-black/10 dark:ring-white/10 flex items-center gap-1.5 tracking-tight">
                <MapPin size={12} className="text-rose-500 dark:text-rose-400 shrink-0" />
                <span>{p.municipality}</span>
              </span>
            )}
          </div>

          {/* Price bottom-right */}
          <div className="absolute bottom-3 right-3">
            <span className="bg-white dark:bg-stone-950 text-teal-700 dark:text-teal-300 font-extrabold text-[12px] px-2.5 py-1 rounded-full shadow-lg border border-stone-200/80 dark:border-white/20 ring-1 ring-black/10 dark:ring-white/10 flex items-center gap-1">
              {p.price_monthly && p.accepts_long_term ? (
                <>
                  <span className="text-teal-700 dark:text-teal-300 font-extrabold">{formatCurrency(p.price_monthly)}</span>
                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-300">/mo</span>
                </>
              ) : p.price_daily && p.accepts_transient ? (
                <>
                  <span className="text-teal-700 dark:text-teal-300 font-extrabold">{formatCurrency(p.price_daily)}</span>
                  <span className="text-[10px] font-medium text-stone-500 dark:text-stone-300">/day</span>
                </>
              ) : (
                <span className="text-stone-800 dark:text-stone-100 font-bold text-[11px] tracking-tight">Prices vary</span>
              )}
            </span>
          </div>
        </div>

        <div className="p-4">
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[15px] font-bold text-stone-900 dark:text-stone-100 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors truncate">
              {p.name}
            </p>
            <div className="flex items-center gap-1 bg-teal-50 dark:bg-teal-950/60 text-teal-700 dark:text-teal-300 px-2 py-0.5 rounded-full border border-teal-200 dark:border-teal-800/60 flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" /></svg>
              <span className="text-[9px] font-bold tracking-wider uppercase">Verified</span>
            </div>
          </div>

          <p className="text-[11px] text-stone-500 dark:text-stone-400 flex items-center gap-1 mb-2.5">
            <MapPin size={11} className="flex-shrink-0 text-stone-400" /> <span className="truncate">{p.address}</span>
          </p>

          {/* Ratings / Satisfaction Badge */}
          <div className="flex items-center justify-between mb-3 bg-stone-50 dark:bg-stone-800/60 p-2 rounded-xl border border-stone-100 dark:border-white/5">
            <div className="flex items-center gap-1.5">
              <StarRating rating={p.rating || 0} size={12} />
              <span className="text-[11px] font-bold text-stone-800 dark:text-stone-200">
                {(p.rating || 0).toFixed(1)}
              </span>
            </div>
            <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium">
              {p.review_count || 0} reviews
            </span>
          </div>

          {/* Amenity chips */}
          {(p.amenities || []).length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {(p.amenities || []).slice(0, 3).map(function(a) {
                return (
                  <span key={a} className="text-[10px] px-2 py-0.5 bg-stone-50 dark:bg-stone-800 text-stone-600 dark:text-stone-400 rounded-full border border-stone-200/60 dark:border-white/5">
                    {a}
                  </span>
                )
              })}
              {(p.amenities || []).length > 3 && (
                <span className="text-[10px] px-2 py-0.5 bg-stone-50 dark:bg-stone-800 text-stone-400 rounded-full">
                  +{p.amenities.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-4 pt-0">
        <button
          onClick={function(e) { e.stopPropagation(); if (onClickRooms) onClickRooms(); else onClick(e); }}
          className="w-full text-[12px] text-teal-800 dark:text-teal-200 font-bold flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-100 dark:hover:bg-teal-900/60 border border-teal-200/70 dark:border-teal-800/40 transition-colors shadow-sm cursor-pointer"
        >
          <BedDouble size={13} /> View available rooms →
        </button>
      </div>
    </div>
  )
}
