import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, StarRating } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { Sparkles, MapPin, ArrowRight } from 'lucide-react'

var BUDGETS = [
  { value: '1k-2k', label: '₱1,000–₱2,000', min: 1000, max: 2000 },
  { value: '2k-3.5k', label: '₱2,000–₱3,500', min: 2000, max: 3500 },
  { value: '3.5k+', label: '₱3,500+', min: 3500, max: 99999 },
]
var MUNICIPALITIES = ['Any', 'Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Sabtang', 'Itbayat']
var PREFS = ['Any', 'WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry', 'Garden', 'Furnished']

function scoreProperty(p, opts) {
  var score = 0
  var budget = opts.budget
  var municipality = opts.municipality
  var amenityPrefs = opts.amenityPrefs

  if (p.price_monthly >= budget.min && p.price_monthly <= budget.max) score += 30
  if (municipality === 'Any' || p.municipality === municipality) score += 25
  score += Math.round(((p.rating || 0) / 5) * 20)
  amenityPrefs.forEach(function(pref) {
    if ((p.amenities || []).indexOf(pref) !== -1) score += 5
  })
  if ((p.available_rooms || 0) > 0) score += 10
  return Math.min(score, 100)
}

export default function Recommendations() {
  var navigate = useNavigate()
  var user = useAuthStore(function(s) { return s.user })
  var fetchProperties = useAuthStore(function(s) { return s.fetchProperties })

  var allPropsState = useState([])
  var allProperties = allPropsState[0], setAllProperties = allPropsState[1]
  
  var budgetState = useState(user?.preferences?.budget || '2k-3.5k')
  var budget = budgetState[0], setBudget = budgetState[1]
  
  var municipalityState = useState(user?.preferences?.municipality || 'Any')
  var municipality = municipalityState[0], setMunicipality = municipalityState[1]
  
  var amenityPrefsState = useState(user?.preferences?.amenityPrefs || [])
  var amenityPrefs = amenityPrefsState[0], setAmenityPrefs = amenityPrefsState[1]
  
  var generatedState = useState(!!user?.preferences)
  var generated = generatedState[0], setGenerated = generatedState[1]

  function togglePref(p) {
    setAmenityPrefs(function(prev) {
      return prev.indexOf(p) === -1 ? prev.concat([p]) : prev.filter(function(x) { return x !== p })
    })
  }

  var loadProperties = useCallback(function() {
    fetchProperties({ status: 'active' }).then(function(data) {
      setAllProperties(data)
    }).catch(function(err) {
      console.error('Failed to load properties:', err)
    })
  }, [fetchProperties])

  useFocusRefresh(loadProperties, [fetchProperties])

  var results = useMemo(function() {
    if (!generated) return []
    var budgetObj = BUDGETS.find(function(b) { return b.value === budget }) || { min: 2000, max: 3500 }
    
    return allProperties
      .map(function(p) { 
        return Object.assign({}, p, { score: scoreProperty(p, { budget: budgetObj, municipality: municipality, amenityPrefs: amenityPrefs }) }) 
      })
      .sort(function(a, b) { return b.score - a.score })
      .slice(0, 5)
  }, [generated, allProperties, budget, municipality, amenityPrefs])

  return (
    <div className="page-enter p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div>
        <Card>
          <div className="p-4 border-b border-stone-100"><h3 className="font-semibold text-stone-800">Tenant Preferences</h3></div>
          <div className="p-4 space-y-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1.5">Monthly Budget</label>
              <select value={budget} onChange={function(e) { setBudget(e.target.value); setGenerated(false) }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none">
                {BUDGETS.map(function(b) { return <option key={b.value} value={b.value}>{b.label}</option> })}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1.5">Municipality Preference</label>
              <select value={municipality} onChange={function(e) { setMunicipality(e.target.value); setGenerated(false) }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none">
                {MUNICIPALITIES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 block mb-2">Preferences</label>
              <div className="flex flex-wrap gap-1.5">
                {PREFS.map(function(p) {
                  return (
                    <button key={p} onClick={function() { togglePref(p); setGenerated(false) }}
                      className={'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ' + (amenityPrefs.indexOf(p) !== -1 ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-300' : 'bg-white text-stone-500 border-stone-200')}>
                      {p}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="p-4 pt-0">
            <button className="w-full px-4 py-2 rounded-lg bg-[--teal] text-white text-sm font-medium flex items-center justify-center gap-1.5" onClick={function() { setGenerated(true) }}>
              <Sparkles size={14} /> Generate Recommendations
            </button>
          </div>
        </Card>
      </div>

      <div className="lg:col-span-2">
        {!generated ? (
          <div className="flex flex-col items-center justify-center h-64 text-stone-400">
            <Sparkles size={32} className="mb-3 text-stone-300" />
            <p className="font-medium text-stone-500">Set your preferences and generate recommendations</p>
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16 text-stone-400">
            <p className="text-4xl mb-3">🔍</p>
            <p className="font-medium">No matching properties</p>
            <p className="text-sm mt-1">Try adjusting your preferences.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-stone-700">Top Matches</h2>
              <Badge variant="teal">{results.length} recommendations</Badge>
            </div>
            {results.map(function(p, i) {
              var scoreColor = p.score >= 80 ? '#1D9E75' : p.score >= 60 ? '#BA7517' : '#D85A30'
              return (
                <Card key={p.id} className="flex flex-row items-center gap-2 sm:gap-4 p-2.5 sm:p-4">
                  <div className="text-sm sm:text-2xl font-bold text-stone-200 w-4 sm:w-6 flex-shrink-0 text-center">{i + 1}</div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-2xl flex-shrink-0 bg-stone-50">🏠</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] sm:text-[13px] font-semibold text-stone-800 mb-0.5 truncate">{p.name}</p>
                    <p className="text-[9px] sm:text-[11px] text-stone-400 flex items-center gap-1 mb-1 sm:mb-1.5 truncate">
                      <MapPin className="w-[9px] h-[9px] sm:w-[10px] sm:h-[10px]" /> {p.municipality}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="hidden xs:block"><StarRating rating={p.rating || 0} size={10} /></div>
                      <span className="text-[9px] sm:text-[10px] text-stone-400 truncate">{p.available_rooms || 0} rooms</span>
                    </div>
                    {p.amenities && p.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 sm:mt-1.5 h-[14px] sm:h-auto overflow-hidden">
                        {p.amenities.slice(0, 3).map(function(a) {
                          return <span key={a} className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-[1px] sm:py-0.5 bg-[#E1F5EE] text-[#0F6E56] rounded-sm sm:rounded-md whitespace-nowrap">{a}</span>
                        })}
                      </div>
                    )}
                  </div>
                  <div className="text-center flex-shrink-0 w-10 sm:w-20">
                    <p className="font-bold text-lg sm:text-2xl leading-none" style={{ color: scoreColor }}>{p.score}%</p>
                    <p className="text-[8px] sm:text-[10px] text-stone-400 mt-0.5">match</p>
                  </div>
                  <button className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-[--teal] text-white flex-shrink-0 ml-1 sm:ml-0 hover:bg-teal-700 transition-colors" onClick={function() { navigate('/tenant/property/' + p.id) }}>
                    <ArrowRight className="w-[12px] h-[12px] sm:w-[13px] sm:h-[13px]" />
                  </button>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
