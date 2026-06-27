import { useState, useEffect, useCallback, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, Button } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Users, Search, MessageSquare, X, AlertTriangle } from 'lucide-react'
const TYPE_COLORS = {
  student: 'bg-purple-100 text-purple-700',
  professional: 'bg-teal-100 text-teal-700',
  government_employee: 'bg-amber-100 text-amber-700',
  visitor: 'bg-stone-100 text-stone-600',
}
const TYPE_LABELS = {
  student: 'Student',
  professional: 'Professional',
  government_employee: 'Government Employee',
  visitor: 'Visitor / Tourist',
}

export default function HomeownerTenants() {
  var user = useAuthStore(function(s) { return s.user })
  var fetchTenants = useAuthStore(function(s) { return s.fetchTenants })
  var fetchReservations = useAuthStore(function(s) { return s.fetchReservations })
  var fetchProperties = useAuthStore(function(s) { return s.fetchProperties })
  var navigate = useNavigate()

  var queryState = useState('')
  var query = queryState[0], setQuery = queryState[1]
  var filterState = useState('All')
  var filter = filterState[0], setFilter = filterState[1]
  var tenantsState = useState([])
  var tenants = tenantsState[0], setTenants = tenantsState[1]
  var [activeTab, setActiveTab] = useState('active')
  var [endingTenant, setEndingTenant] = useState(null)
  var updateReservationStatus = useAuthStore(function(s) { return s.updateReservationStatus })
  var loadingState = useState(true)
  var loading = loadingState[0], setLoading = loadingState[1]
  var errorState = useState(null)
  var errorMsg = errorState[0], setErrorMsg = errorState[1]
  var wasHiddenRef = useRef(false)
  var addToast = useAppStore(function(s) { return s.addToast })

  var loadTenants = useCallback(function() {
    setLoading(true)
    setErrorMsg(null)
    Promise.all([
      fetchProperties({ ownerId: user?.id }),
      fetchReservations(),
    ]).then(function(results) {
      var props = results[0] || []
      var reservations = results[1] || []
      var myPropIds = props.map(function(p) { return p.id })
      var validRes = reservations.filter(function(r) {
        return myPropIds.indexOf(r.property_id) !== -1 && (r.status === 'confirmed' || r.status === 'approved' || r.status === 'completed')
      })
      
      return fetchTenants().then(function(allTenants) {
        var myTenants = []
        validRes.forEach(function(r) {
          var t = allTenants.find(function(x) { return x.id === r.tenant_id })
          if (t) {
            var propName = props.find(function(p) { return p.id === r.property_id })?.name || 'Unknown Property'
            myTenants.push({
              ...t,
              reservation_id: r.id,
              reservation_status: r.status,
              ended_at: r.ended_at,
              property_name: propName,
              reservation_created: r.created_at,
              check_in: r.check_in,
              duration_months: r.duration_months
            })
          }
        })
        setTenants(myTenants)
        setLoading(false)
      })
    }).catch(function(err) {
      console.error('Failed to load tenants:', err)
      setErrorMsg(err.message || 'An unknown error occurred')
      setLoading(false)
    })
  }, [user?.id, fetchProperties, fetchReservations, fetchTenants])

  useEffect(function() { loadTenants() }, [loadTenants])

  useEffect(function() {
    function handleVisibility() {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        loadTenants()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return function() { document.removeEventListener('visibilitychange', handleVisibility) }
  }, [loadTenants])

  function handleEndContract() {
    if (!endingTenant) return;
    setLoading(true)
    updateReservationStatus(endingTenant.reservation_id, 'completed').then(function() {
      setEndingTenant(null)
      loadTenants()
    }).catch(function(err) {
      addToast('Failed to end contract: ' + err.message, 'error')
      setLoading(false)
    })
  }

  var currentTenants = tenants.filter(function(t) {
    if (activeTab === 'active') return t.reservation_status !== 'completed'
    return t.reservation_status === 'completed'
  })

  var filtered = currentTenants.filter(function(t) {
    var q = query.toLowerCase()
    if (q && !(t.full_name || '').toLowerCase().includes(q)) return false
    if (filter !== 'All' && (t.tenant_type || '').toLowerCase() !== filter.toLowerCase()) return false
    return true
  })

  return (
    <div className="page-enter p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-bold text-xl text-stone-800">My Tenants</h1>
        <Button variant="ghost" size="sm" onClick={function() { navigate('/owner') }}>← Back to Dashboard</Button>
      </div>

      <div className="flex border-b border-stone-200 mb-6">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'active' ? 'text-[--teal]' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Active Tenants
          {activeTab === 'active' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[--teal]" />}
        </button>
        <button
          onClick={() => setActiveTab('past')}
          className={`px-4 py-2 font-medium text-sm transition-colors relative ${activeTab === 'past' ? 'text-[--teal]' : 'text-stone-500 hover:text-stone-700'}`}
        >
          Past Tenants
          {activeTab === 'past' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[--teal]" />}
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
        <div className="relative w-full sm:flex-1 sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400" />
          <input
            type="text"
            placeholder="Search tenants…"
            value={query}
            onChange={function(e) { setQuery(e.target.value) }}
            className="w-full pl-9 pr-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 snap-x hide-scrollbar">
          {['All', 'Student', 'Professional', 'Government Employee', 'Visitor'].map(function(f) {
            var val = f === 'All' ? 'All' : f === 'Student' ? 'student' : f === 'Professional' ? 'professional' : f === 'Government Employee' ? 'government_employee' : 'visitor'
            return (
              <button
                key={f}
                onClick={function() { setFilter(val) }}
                className={'flex-shrink-0 snap-start px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-full text-[10px] sm:text-[11px] font-medium border transition-all ' + (filter === val ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-300' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300')}
              >
                {f}
              </button>
            )
          })}
        </div>
      </div>

      <Card>
        {errorMsg ? (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 flex flex-col items-center justify-center text-center text-red-500 min-h-[300px]">
            <Users size={48} className="text-red-300 mb-4" />
            <p className="font-semibold mb-1">Error Loading Tenants</p>
            <p className="text-sm max-w-md">{errorMsg}</p>
          </div>
        ) : loading ? (
          <div className="flex justify-center p-12 text-stone-400">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[--teal]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <Users size={32} className="mx-auto text-stone-300 mb-3" />
            <p className="text-stone-600 font-medium">No tenants found</p>
            <p className="text-sm text-stone-400 mt-1">Tenants with approved reservations will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[500px] sm:min-w-0">
              <thead>
                <tr className="border-b border-stone-100">
                  {['Tenant', 'Type', 'Property', 'Joined'].map(function(h, idx) {
                    return <th key={h || idx} className="text-left px-3 py-2 sm:px-4 sm:py-3 text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 font-medium">{h}</th>
                  })}
                  {activeTab === 'active' && (
                    <th className="text-left px-3 py-2 sm:px-4 sm:py-3 text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 font-medium">Expires On</th>
                  )}
                  {activeTab === 'past' && (
                    <th className="text-left px-3 py-2 sm:px-4 sm:py-3 text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 font-medium">Ended On</th>
                  )}
                  <th className="text-left px-3 py-2 sm:px-4 sm:py-3 text-[8px] sm:text-[10px] uppercase tracking-wider text-stone-400 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(function(t) {
                  return (
                    <tr key={t.id} className="border-b border-stone-50 hover:bg-stone-50/50">
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        <div className="flex items-center gap-2 sm:gap-2.5">
                          <div
                            className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[9px] sm:text-[11px] font-semibold bg-stone-50"
                          >
                            {(t.full_name || '??').split(' ').map(function(n) { return n[0] }).slice(0, 2).join('').toUpperCase()}
                          </div>
                          <div>
                            <p className="text-[10px] sm:text-[12px] font-medium text-stone-800 truncate max-w-[80px] sm:max-w-none">{t.full_name}</p>
                            <p className="text-[8px] sm:text-[10px] text-stone-400">{t.id ? t.id.substring(0, 8) : ''}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3">
                        <span className="text-[9px] sm:text-[11px] px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-md sm:rounded-full font-medium bg-stone-100 text-stone-600 whitespace-nowrap">
                          {TYPE_LABELS[t.tenant_type] || t.tenant_type || 'Tenant'}
                        </span>
                      </td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 truncate max-w-[80px] sm:max-w-none">{t.property_name || '—'}</td>
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 whitespace-nowrap">
                        {t.reservation_created ? new Date(t.reservation_created).toLocaleDateString() : '—'}
                      </td>
                      {activeTab === 'active' && (
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-red-500 whitespace-nowrap font-medium">
                          {(() => {
                            if (!t.check_in) return '—'
                            const d = new Date(t.check_in)
                            d.setMonth(d.getMonth() + (t.duration_months || 1))
                            return d.toLocaleDateString()
                          })()}
                        </td>
                      )}
                      {activeTab === 'past' && (
                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] text-stone-600 whitespace-nowrap">
                          {t.ended_at ? new Date(t.ended_at).toLocaleDateString() : '—'}
                        </td>
                      )}
                      <td className="px-3 py-2 sm:px-4 sm:py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="px-2 py-1 h-auto text-[--teal] hover:bg-teal-50"
                            onClick={() => navigate('/owner/messages', { 
                              state: { autoSelectUser: { id: t.id, full_name: t.full_name, role: 'tenant' } } 
                            })}
                          >
                            <MessageSquare size={14} className="sm:mr-1.5" />
                            <span className="hidden sm:inline">Message</span>
                          </Button>
                          {activeTab === 'active' && (
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              className="px-2 py-1 h-auto text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => setEndingTenant(t)}
                            >
                              <span className="hidden sm:inline">End Contract</span>
                              <span className="sm:hidden">End</span>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {endingTenant && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEndingTenant(null)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 text-center" onClick={(e) => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600 mx-auto mb-4">
              <AlertTriangle size={24} />
            </div>
            <h3 className="font-bold text-lg text-stone-800 mb-2">End Contract</h3>
            <p className="text-sm text-stone-600 mb-6">
              Are you sure you want to end the contract for <strong>{endingTenant.full_name}</strong> at <strong>{endingTenant.property_name}</strong>? 
              This will free up the room for new bookings.
            </p>
            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 border border-stone-200" onClick={() => setEndingTenant(null)}>Cancel</Button>
              <Button className="flex-1 bg-red-600 hover:bg-red-700 text-white" onClick={handleEndContract}>
                Yes, End Contract
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
