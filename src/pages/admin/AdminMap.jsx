import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import PropertyMap from '@/components/map/PropertyMap'

export default function AdminMap() {
  const navigate = useNavigate()
  const { fetchProperties, user } = useAuthStore()
  const [properties, setProperties] = useState([])
  const [loading, setLoading] = useState(true)

  const loadProperties = useCallback(() => {
    // Admins need to see everything, not just active ones.
    fetchProperties({}).then((data) => {
      let filtered = data || []
      
      // Regional Filtering
      if (user?.role === 'admin' && user?.admin_region) {
        if (user.admin_region === 'Batan Island') {
          filtered = filtered.filter(p => ['Basco', 'Mahatao', 'Ivana', 'Uyugan'].includes(p.municipality))
        } else {
          filtered = filtered.filter(p => p.municipality === user.admin_region)
        }
      }

      setProperties(filtered)
    }).catch((err) => {
      console.error('Failed to load properties:', err)
    }).finally(() => {
      setLoading(false)
    })
  }, [fetchProperties, user])

  useFocusRefresh(loadProperties, [loadProperties])

  const pinned = properties.filter(p => p.latitude && p.longitude)
  const unpinned = properties.filter(p => !p.latitude || !p.longitude)

  return (
    <div className="page-enter flex flex-col" style={{ height: 'calc(100vh - 0px)' }}>
      {/* Header */}
      <div className="px-6 pt-5 pb-3 flex items-center justify-between flex-shrink-0">
        <div>
          <p className="font-bold text-2xl text-stone-800">
            {user?.role === 'super_admin' ? 'Global System Map' : `${user?.admin_region || 'Regional'} Map`}
          </p>
          <p className="text-sm text-stone-400 mt-0.5">
            {loading ? 'Loading…' : `${pinned.length} properties on map · ${unpinned.length} without location`}
          </p>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 text-[11px] text-stone-500">
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1D9E75', display: 'inline-block' }} />
            Active
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#BA7517', display: 'inline-block' }} />
            Pending Review
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#D85A30', display: 'inline-block' }} />
            Fully Booked / Inactive
          </span>
        </div>
      </div>

      {/* Map – fills remaining height */}
      <div className="flex-1 px-6 pb-6 min-h-0">
        <div className="w-full h-full rounded-2xl overflow-hidden border border-stone-200 shadow-sm relative">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center bg-stone-50 text-stone-400 text-sm">
              Loading map…
            </div>
          ) : (
            <>
              {unpinned.length > 0 && (
                <div className="absolute top-4 left-4 z-10 bg-amber-50 border border-amber-200 text-amber-800 text-xs px-3 py-2 rounded-lg shadow-sm">
                  <strong>{unpinned.length} propert{unpinned.length === 1 ? 'y' : 'ies'}</strong> do not have a location set and are not shown.
                </div>
              )}
              <PropertyMap
                properties={pinned}
                onPropertyClick={(id) => navigate(`/admin/property/${id}`)}
              />
            </>
          )}
        </div>
      </div>
    </div>
  )
}
