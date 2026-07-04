import Topbar from '@/components/layout/Topbar'
import { Card, CardHeader, CardTitle, Badge, StarRating, OccupancyBar, Avatar } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useState, useEffect, useCallback, useRef } from 'react'

var CATEGORIES = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
  { key: 'safety', label: 'Safety' },
]

export default function Reviews() {
  var fetchReviews = useAuthStore(function(s) { return s.fetchReviews })
  var fetchProperties = useAuthStore(function(s) { return s.fetchProperties })

  var reviewsState = useState([])
  var reviews = reviewsState[0], setReviews = reviewsState[1]
  var propertiesState = useState([])
  var properties = propertiesState[0], setProperties = propertiesState[1]
  var selectedState = useState('all')
  var selectedProperty = selectedState[0], setSelectedProperty = selectedState[1]
  var loadingState = useState(true)
  var loading = loadingState[0], setLoading = loadingState[1]
  var wasHiddenRef = useRef(false)

  var loadData = useCallback(function(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([
      fetchProperties({ status: 'active' }),
      fetchReviews(selectedProperty === 'all' ? null : selectedProperty),
    ]).then(function(results) {
      setProperties(results[0])
      setReviews(results[1])
      if (!silent) setLoading(false)
    }).catch(function(err) {
      console.error('Failed to load reviews:', err)
      if (!silent) setLoading(false)
    })
  }, [selectedProperty, fetchProperties, fetchReviews])

  useEffect(function() { loadData() }, [loadData])

  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadData(true)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function() { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadData])

  var overall = reviews.length > 0
    ? (reviews.reduce(function(a, r) { return a + (r.rating || 0) }, 0) / reviews.length).toFixed(1)
    : '—'

  function avgCategory(key) {
    var vals = reviews.map(function(r) { return r[key] }).filter(Boolean)
    return vals.length ? (vals.reduce(function(a, b) { return a + b }, 0) / vals.length).toFixed(1) : '—'
  }

  return (
    <div className="page-enter">
      <Topbar title="Reviews & Ratings">
        <Badge variant="teal">{reviews.length} total reviews</Badge>
      </Topbar>

      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <label className="text-[11px] text-stone-400 font-medium">Filter by property:</label>
          <select value={selectedProperty} onChange={function(e) { setSelectedProperty(e.target.value); loadData() }}
            className="px-3 py-1.5 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none">
            <option value="all">All Properties</option>
            {properties.map(function(p) { return <option key={p.id} value={p.id}>{p.name}</option> })}
          </select>
        </div>

        {loading ? (
          <div className="text-center py-16 text-stone-400">Loading reviews…</div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <div className="p-4 border-b border-stone-100"><h3 className="font-semibold text-stone-800">Overall Rating</h3></div>
                <div className="p-4 flex items-center gap-6">
                  <div className="text-center">
                    <p className="font-bold text-5xl text-[--teal]">{overall}</p>
                    <StarRating rating={parseFloat(overall) || 0} size={14} />
                    <p className="text-[11px] text-stone-400 mt-1">{reviews.length} reviews</p>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="p-4 border-b border-stone-100"><h3 className="font-semibold text-stone-800">Category Scores</h3></div>
                <div className="p-4 space-y-2">
                  {CATEGORIES.map(function(cat) {
                    return (
                      <div key={cat.key} className="flex items-center gap-3">
                        <span className="text-[12px] text-stone-500 w-24 flex-shrink-0">{cat.label}</span>
                        <div className="flex-1 h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-[#1D9E75]" style={{ width: ((parseFloat(avgCategory(cat.key)) || 0) / 5 * 100) + '%' }} />
                        </div>
                        <span className="text-[12px] font-semibold text-stone-700 w-6 text-right">{avgCategory(cat.key)}</span>
                      </div>
                    )
                  })}
                </div>
              </Card>
            </div>

            {reviews.length === 0 ? (
              <div className="text-center py-12 text-stone-400">
                <p className="text-3xl mb-2">⭐</p>
                <p>No reviews yet.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {reviews.map(function(r, i) {
                  return (
                    <Card key={r.id}>
                      <div className="p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-[#E1F5EE] flex items-center justify-center text-[11px] font-semibold text-[#0F6E56] flex-shrink-0">
                          {r.reviewer?.full_name ? r.reviewer.full_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase() : (r.tenant_id || '??').substring(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-[12px] font-semibold text-stone-800 truncate">{r.reviewer?.full_name || 'Tenant'}</p>
                            <p className="text-[10px] text-stone-400 flex-shrink-0 ml-2">{r.created_at ? new Date(r.created_at).toLocaleDateString() : ''}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <StarRating rating={r.rating || 0} size={10} />
                            <span className="text-[10px] text-stone-400">{r.rating}/5</span>
                          </div>
                        </div>
                      </div>
                      {r.text && <div className="px-4 pb-4"><p className="text-[12px] text-stone-500 leading-relaxed">{r.text}</p></div>}
                    </Card>
                  )
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
