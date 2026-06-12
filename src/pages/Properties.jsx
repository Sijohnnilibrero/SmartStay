import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Topbar from '@/components/layout/Topbar'
import { Button, Badge, OccupancyBar, Input, FilterChip } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import {
  Plus, Search, Eye, CheckCircle, XCircle, Edit, Trash2,
  Home, TrendingUp, Clock, Layers, MapPin, BedDouble, Wifi, Droplets,
} from 'lucide-react'

const STATUS_COLORS = { pending_review: 'amber', active: 'teal', full: 'coral', inactive: 'gray' }
const STATUS_LABEL  = { pending_review: 'Pending Review', active: 'Active', full: 'Fully Booked', inactive: 'Inactive' }

const PROPERTY_IMAGES = [
  '/images/property_1.png',
  '/images/property_2.png',
  '/images/property_3.png',
]

const AMENITY_ICONS = {
  WiFi: <Wifi size={10} />, Water: <Droplets size={10} />, default: null,
}

export default function Properties() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const isAdmin = user?.role === 'admin'
  const fetchProperties = useAuthStore((s) => s.fetchProperties)
  const updatePropertyStatus = useAuthStore((s) => s.updatePropertyStatus)
  const deleteProperty = useAuthStore((s) => s.deleteProperty)

  const [query, setQuery] = useState('')
  const [island, setIsland] = useState('All')
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)
  const [error, setError] = useState('')
  const [confirmAction, setConfirmAction] = useState(null)
  const wasHiddenRef = useRef(false)

  const loadProperties = useCallback(function () {
    setLoading(true)
    setError('')
    fetchProperties(isAdmin ? {} : { ownerId: user?.id }).then(function (data) {
      setProperties(data)
      setLoading(false)
    }).catch(function (err) {
      setError(err.message || 'Failed to load properties.')
      setLoading(false)
    })
  }, [isAdmin, user?.id, fetchProperties])

  useEffect(function () { loadProperties() }, [loadProperties])

  useEffect(function () {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadProperties()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function () { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadProperties])

  function cancelConfirm() { setConfirmAction(null) }
  function askConfirm(id, status, label) { setConfirmAction({ id, status, label }) }
  function confirmStatusChange() {
    var id = confirmAction.id; var status = confirmAction.status
    setConfirmAction(null); handleStatusChange(id, status)
  }

  function handleStatusChange(id, status) {
    setActioning(id)
    updatePropertyStatus(id, status).then(function () {
      setProperties(function (prev) {
        return prev.map(function (p) { return p.id === id ? { ...p, status } : p })
      })
    }).catch(function (err) {
      setError('Failed to update status: ' + (err.message || err))
    }).finally(function () { setActioning(null) })
  }

  function handleDelete(id) {
    if (!confirm('Delete this property?')) return
    setActioning(id)
    deleteProperty(id).then(function () {
      setProperties(function (prev) { return prev.filter(function (p) { return p.id !== id }) })
    }).catch(function (err) {
      setError('Failed to delete: ' + (err.message || err))
    }).finally(function () { setActioning(null) })
  }

  var filteredList = properties.filter(function (p) {
    var q = query.toLowerCase()
    if (q && !(p.name || '').toLowerCase().includes(q) && !(p.address || '').toLowerCase().includes(q)) return false
    if (island !== 'All' && p.island !== island) return false
    return true
  })

  var stats = {
    total: properties.filter(function (p) { return p.status !== 'pending_review' }).length,
    active: properties.filter(function (p) { return p.status === 'active' }).length,
    available: properties.filter(function (p) { return (p.available_rooms || 0) > 0 && p.status !== 'pending_review' }).length,
    pending: properties.filter(function (p) { return p.status === 'pending_review' }).length,
  }

  const STAT_ITEMS = [
    { label: 'Total Properties', value: stats.total,     accent: '#0F6E56', bg: '#E1F5EE', icon: <Home size={16} /> },
    { label: 'Active',           value: stats.active,    accent: '#1D9E75', bg: '#D1FAE5', icon: <TrendingUp size={16} /> },
    { label: 'Has Vacancies',    value: stats.available, accent: '#534AB7', bg: '#EEEDFE', icon: <BedDouble size={16} /> },
    { label: 'Pending Review',   value: stats.pending,   accent: '#BA7517', bg: '#FAEEDA', icon: <Clock size={16} /> },
  ]

  return (
    <div className="page-enter">
      <Topbar title="Properties">
        {!isAdmin && (
          <Button variant="primary" size="sm" onClick={() => navigate('/owner/properties/add')}>
            <Plus size={13} /> Add Property
          </Button>
        )}
      </Topbar>

      <div className="p-6 space-y-5">
        {error && (
          <div className="p-3 rounded-lg bg-[#FAECE7] border border-[#D85A30] text-[13px] text-[#993C1D]">
            {error}
          </div>
        )}

        {/* Stats Row */}
        <div className="flex overflow-x-auto pb-1 sm:pb-0 snap-x hide-scrollbar gap-2 sm:gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-4">
          {STAT_ITEMS.map(function (s) {
            return (
              <div key={s.label}
                className="flex-shrink-0 w-[140px] sm:w-auto snap-start bg-white rounded-xl sm:rounded-2xl border border-stone-200 p-3 sm:p-4 flex items-center gap-2 sm:gap-3 hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: s.bg, color: s.accent }}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-[9px] sm:text-[10px] uppercase tracking-wider text-stone-400 truncate">{s.label}</p>
                  <p className="font-bold text-lg sm:text-2xl leading-tight truncate" style={{ color: s.accent }}>{s.value}</p>
                </div>
              </div>
            )
          })}
        </div>

        {/* Search & Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative w-full sm:flex-1 sm:max-w-sm flex-shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
            <Input className="w-full pl-9" placeholder="Search by name or address…" value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0 snap-x hide-scrollbar flex-1">
            {['All', 'Batan', 'Sabtang', 'Itbayat'].map(function (i) {
              return <div key={i} className="flex-shrink-0 snap-start"><FilterChip label={i} active={island === i} onClick={() => setIsland(i)} /></div>
            })}
          </div>
          <p className="text-[10px] sm:text-[11px] text-stone-400 sm:ml-auto w-full sm:w-auto text-right">{filteredList.length} propert{filteredList.length !== 1 ? 'ies' : 'y'}</p>
        </div>

        {/* Property Cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
                <div className="h-44 shimmer" />
                <div className="p-4 space-y-2">
                  <div className="h-4 shimmer rounded w-3/4" />
                  <div className="h-3 shimmer rounded w-1/2" />
                  <div className="h-2 shimmer rounded mt-3" />
                </div>
              </div>
            ))}
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-20 text-stone-400">
            <div className="w-16 h-16 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Home size={28} className="text-stone-300" />
            </div>
            <p className="font-semibold text-stone-600 text-base">No properties found</p>
            {!isAdmin && <p className="text-sm mt-1">Click "Add Property" to create one.</p>}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredList.map(function (p, idx) {
              const imgSrc = p.image_url || PROPERTY_IMAGES[idx % PROPERTY_IMAGES.length]
              const occupied = p.total_rooms - (p.available_rooms || 0)
              const amenities = Array.isArray(p.amenities) ? p.amenities.slice(0, 3) : []
              const isFull = (p.available_rooms || 0) === 0

              return (
                <div key={p.id}
                  className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-lg hover:-translate-y-1 transition-all duration-200 group">

                  {/* Image Header */}
                  <div className="relative h-44 overflow-hidden">
                    <img
                      src={imgSrc}
                      alt={p.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

                    {/* Status badge top-left */}
                    <div className="absolute top-3 left-3">
                      <Badge variant={STATUS_COLORS[p.status] || 'gray'}>
                        {STATUS_LABEL[p.status] || p.status}
                      </Badge>
                    </div>

                    {/* Price bottom-right */}
                    <div className="absolute bottom-3 right-3">
                      <span className="bg-white/95 backdrop-blur-sm text-[--teal] font-bold text-[13px] px-2.5 py-1 rounded-full shadow-sm">
                        {p.price_monthly ? (
                          <>{formatCurrency(p.price_monthly)}<span className="text-[10px] font-normal text-stone-500">/mo</span></>
                        ) : (
                          'Prices vary'
                        )}
                      </span>
                    </div>

                    {/* Island badge bottom-left */}
                    {p.island && (
                      <div className="absolute bottom-3 left-3">
                        <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                          {p.island}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Card Body */}
                  <div className="p-4">
                    <div className="mb-3">
                      <p className="font-semibold text-stone-800 text-[14px] truncate">{p.name}</p>
                      <p className="text-[11px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <MapPin size={10} className="flex-shrink-0" />
                        <span className="truncate">{p.address || p.municipality}</span>
                      </p>
                    </div>

                    {/* Amenities */}
                    {amenities.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {amenities.map((a) => (
                          <span key={a} className="inline-flex items-center gap-0.5 text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 font-medium">
                            {a}
                          </span>
                        ))}
                        {(p.amenities || []).length > 3 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-stone-100 text-stone-400">
                            +{p.amenities.length - 3}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Occupancy */}
                    <OccupancyBar
                      label={`${occupied}/${p.total_rooms} rooms occupied`}
                      value={occupied}
                      max={p.total_rooms}
                      color={isFull ? '#D85A30' : '#1D9E75'}
                    />

                    {/* Admin approve/reject */}
                    {isAdmin && p.status === 'pending_review' && (
                      <div className="flex gap-2 mt-3 pt-3 border-t border-stone-100">
                        <Button size="sm" variant="primary" className="flex-1"
                          disabled={actioning === p.id}
                          onClick={() => askConfirm(p.id, 'active', 'approve')}>
                          <CheckCircle size={12} /> Approve
                        </Button>
                        <Button size="sm" variant="danger" className="flex-1"
                          disabled={actioning === p.id}
                          onClick={() => askConfirm(p.id, 'inactive', 'reject')}>
                          <XCircle size={12} /> Reject
                        </Button>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="mt-3 pt-3 border-t border-stone-100 space-y-1.5">
                      {isAdmin && (
                        <div className="flex gap-1.5">
                          <Button size="sm" variant="ghost" className="flex-1 text-[11px]"
                            onClick={() => navigate('/tenant/property/' + p.id)}>
                            <Eye size={12} /> View
                          </Button>
                          <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-50"
                            onClick={() => handleDelete(p.id)} disabled={actioning === p.id}>
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      )}
                      {!isAdmin && (
                        <>
                          {/* Manage Rooms — prominent primary action */}
                          <button
                            onClick={() => navigate('/owner/rooms/' + p.id)}
                            className="w-full py-2 px-3 rounded-xl bg-[#E1F5EE] text-[#0F6E56] text-[12px] font-semibold flex items-center justify-center gap-1.5 hover:bg-[#d0ebe0] transition-colors"
                          >
                            <BedDouble size={13} />
                            Manage Rooms
                            {p.total_rooms > 0 && (
                              <span className="ml-auto bg-[#0F6E56] text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {p.total_rooms}
                              </span>
                            )}
                          </button>
                          {/* Edit & Delete row */}
                          <div className="flex gap-1.5">
                            <Button size="sm" variant="ghost" className="flex-1 text-[11px]"
                              onClick={() => navigate('/owner/properties/edit/' + p.id)}>
                              <Edit size={12} /> Edit Property
                            </Button>
                            <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-50 px-2.5"
                              onClick={() => handleDelete(p.id)} disabled={actioning === p.id}>
                              <Trash2 size={12} />
                            </Button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: confirmAction.status === 'active' ? '#E1F5EE' : '#FAECE7' }}>
              {confirmAction.status === 'active'
                ? <CheckCircle size={22} className="text-[#0F6E56]" />
                : <XCircle size={22} className="text-[#D85A30]" />}
            </div>
            <h3 className="font-bold text-lg text-stone-800 mb-1 text-center">
              {confirmAction.status === 'active' ? 'Approve Property?' : 'Reject Property?'}
            </h3>
            <p className="text-sm text-stone-500 mb-5 text-center">
              This will set the property status to <strong>{confirmAction.status === 'active' ? 'Active' : 'Inactive'}</strong>.
            </p>
            <div className="flex gap-3">
              <button onClick={cancelConfirm}
                className="flex-1 px-4 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-50 transition-colors">
                Cancel
              </button>
              <button onClick={confirmStatusChange}
                className="flex-1 px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors"
                style={{ background: confirmAction.status === 'active' ? '#0F6E56' : '#D85A30' }}>
                Yes, {confirmAction.label}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
