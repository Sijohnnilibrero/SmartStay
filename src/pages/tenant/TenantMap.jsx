import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import PropertyMap from '@/components/map/PropertyMap'
import { MapPin, X } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'

export default function TenantMap() {
  const navigate = useNavigate()
  const { fetchProperties } = useAuthStore()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  var loadProperties = useCallback(function() {
    fetchProperties({ status: 'active' }).then(function(data) {
      setProperties(data || [])
    }).catch(function(err) {
      console.error('Failed to load properties:', err)
    }).finally(function() {
      setLoading(false)
    })
  }, [fetchProperties])

  useFocusRefresh(loadProperties, [fetchProperties])

  const pinned = properties.filter(function (p) { return p.latitude && p.longitude })
  const unpinned = properties.filter(function (p) { return !p.latitude || !p.longitude })

  return (
    <div className="page-enter flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-start justify-between flex-shrink-0">
        <div>
          <p className="font-bold text-lg md:text-xl text-stone-800">Boarding House Map</p>
          <p className="text-sm text-stone-400 mt-0.5">
            {loading ? 'Loading…' : `${pinned.length} properties on map · ${unpinned.length} without location`}
          </p>
        </div>
        {/* Legend + Bell */}
        <div className="flex items-center gap-3 text-[11px] text-stone-500">
          <NotificationBell />
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
            Available
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D85A30', display: 'inline-block' }} />
            No Available Rooms
          </span>
        </div>
      </div>

      {/* Map – fills remaining height */}
      <div className="flex-1 px-6 pb-6 min-h-0">
        <div className="w-full h-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-stone-50 text-stone-400 text-sm">
              Loading map…
            </div>
          ) : (
            <PropertyMap
              mode="browse"
              properties={properties}
              height="100%"
              onSelect={function (id) { navigate('/tenant/property/' + id) }}
            />
          )}
        </div>
      </div>

      {/* Bottom strip – properties without location */}
      {!loading && unpinned.length > 0 && (
        <UnpinnedStrip unpinned={unpinned} onSelect={function (id) { navigate('/tenant/property/' + id) }} />
      )}
    </div>
  )
}

function UnpinnedStrip({ unpinned, onSelect }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <div className="flex-shrink-0 px-6 pb-5">
      <div className="bg-white border border-stone-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-3 pb-2">
          <p className="text-[11px] font-medium text-stone-400 uppercase tracking-wider">
            {unpinned.length} properties not yet on map
          </p>
          <button
            onClick={function () { setDismissed(true) }}
            className="w-6 h-6 flex items-center justify-center rounded-full text-stone-300 hover:bg-stone-100 hover:text-stone-600 transition-all"
            title="Dismiss"
          >
            <X size={13} />
          </button>
        </div>
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto">
          {unpinned.map(function (p) {
            var isFull = (p.available_rooms || 0) === 0
            return (
              <div
                key={p.id}
                onClick={function () { onSelect(p.id) }}
                className="flex-shrink-0 w-44 rounded-xl border border-stone-100 bg-stone-50 p-3 cursor-pointer hover:border-stone-300 hover:bg-white transition-all"
              >
                <p className="text-[12px] font-semibold text-stone-800 truncate mb-0.5">{p.name}</p>
                <p className="text-[10px] text-stone-400 flex items-center gap-0.5 mb-2">
                  <MapPin size={9} /> {p.municipality}, {p.island}
                </p>
                <div className="flex items-center justify-between">
                  <span className={'text-[9px] px-1.5 py-0.5 rounded-full font-medium ' + (isFull ? 'bg-red-100 text-red-600' : 'bg-teal-100 text-teal-700')}>
                    {isFull ? 'Full' : (p.available_rooms) + ' left'}
                  </span>
                  <p className="text-[11px] font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded inline-block mt-1">Prices vary</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
