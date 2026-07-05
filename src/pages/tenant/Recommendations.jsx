import { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Badge, StarRating } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useFocusRefresh } from '@/hooks/useFocusRefresh'
import { Sparkles, MapPin, ArrowRight, CalendarDays, CalendarClock } from 'lucide-react'

const MONTHLY_BUDGETS = [
  { value: '1k-2k', label: '₱1,000–₱2,000 / mo', min: 1000, max: 2000 },
  { value: '2k-3.5k', label: '₱2,000–₱3,500 / mo', min: 2000, max: 3500 },
  { value: '3.5k+', label: '₱3,500+ / mo', min: 3500, max: 99999 },
]

const DAILY_BUDGETS = [
  { value: '0-500', label: '₱0–₱500 / day', min: 0, max: 500 },
  { value: '500-1k', label: '₱500–₱1,000 / day', min: 500, max: 1000 },
  { value: '1k+', label: '₱1,000+ / day', min: 1000, max: 99999 },
]

const MUNICIPALITIES = ['Any', 'Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Sabtang', 'Itbayat']
const PREFS = ['Any', 'WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry', 'Garden', 'Furnished', 'Air Conditioning']

function scoreProperty(p, opts) {
  let score = 0
  const { budget, municipality, amenityPrefs, stayType } = opts

  if (stayType === 'transient' && !p.accepts_transient) return -1
  if (stayType === 'long_term' && !p.accepts_long_term) return -1

  const priceToCompare = stayType === 'transient' ? (p.price_daily || 0) : (p.price_monthly || 0)
  
  if (priceToCompare >= budget.min && priceToCompare <= budget.max) score += 30
  
  if (municipality === 'Any' || p.municipality === municipality) score += 25
  score += Math.round(((p.rating || 0) / 5) * 20)
  
  amenityPrefs.forEach(pref => {
    if ((p.amenities || []).includes(pref)) score += 5
  })
  
  if ((p.available_rooms || 0) > 0) score += 10
  
  return Math.min(score, 100)
}

export default function Recommendations() {
  const navigate = useNavigate()
  const user = useAuthStore(s => s.user)
  const fetchProperties = useAuthStore(s => s.fetchProperties)

  const [allProperties, setAllProperties] = useState([])
  const [stayType, setStayType] = useState('long_term') // 'long_term' | 'transient'
  
  const [monthlyBudget, setMonthlyBudget] = useState(user?.preferences?.budget || '2k-3.5k')
  const [dailyBudget, setDailyBudget] = useState('500-1k')
  
  const [municipality, setMunicipality] = useState(user?.preferences?.municipality || 'Any')
  const [amenityPrefs, setAmenityPrefs] = useState(user?.preferences?.amenityPrefs || [])
  const [generated, setGenerated] = useState(!!user?.preferences)

  const togglePref = (p) => {
    setAmenityPrefs(prev => prev.includes(p) ? prev.filter(x => x !== p) : [...prev, p])
    setGenerated(false)
  }

  const loadProperties = useCallback(() => {
    fetchProperties({ status: 'active' }).then(data => {
      setAllProperties(data)
    }).catch(err => {
      console.error('Failed to load properties:', err)
    })
  }, [fetchProperties])

  useFocusRefresh(loadProperties, [fetchProperties])

  const results = useMemo(() => {
    if (!generated) return []
    
    const activeBudgets = stayType === 'transient' ? DAILY_BUDGETS : MONTHLY_BUDGETS
    const activeBudgetValue = stayType === 'transient' ? dailyBudget : monthlyBudget
    const budgetObj = activeBudgets.find(b => b.value === activeBudgetValue) || activeBudgets[1]
    
    return allProperties
      .map(p => ({ ...p, score: scoreProperty(p, { budget: budgetObj, municipality, amenityPrefs, stayType }) }))
      .filter(p => p.score >= 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }, [generated, allProperties, monthlyBudget, dailyBudget, municipality, amenityPrefs, stayType])

  return (
    <div className="page-enter p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      <div>
        <Card>
          <div className="p-4 border-b border-stone-100">
            <h3 className="font-semibold text-stone-800">Tenant Preferences</h3>
          </div>
          <div className="p-4 space-y-4">
            {/* STAY TYPE TOGGLE */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1.5">What are you looking for?</label>
              <div className="flex bg-stone-100 p-1 rounded-lg">
                <button 
                  onClick={() => { setStayType('long_term'); setGenerated(false) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${stayType === 'long_term' ? 'bg-white shadow-sm text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <CalendarDays size={14} /> Long-term
                </button>
                <button 
                  onClick={() => { setStayType('transient'); setGenerated(false) }}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 text-xs font-medium rounded-md transition-colors ${stayType === 'transient' ? 'bg-white shadow-sm text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}
                >
                  <CalendarClock size={14} /> Short-term
                </button>
              </div>
            </div>

            {/* DYNAMIC BUDGET */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1.5">
                {stayType === 'transient' ? 'Daily Budget' : 'Monthly Budget'}
              </label>
              <select 
                value={stayType === 'transient' ? dailyBudget : monthlyBudget} 
                onChange={(e) => { 
                  if (stayType === 'transient') setDailyBudget(e.target.value)
                  else setMonthlyBudget(e.target.value)
                  setGenerated(false) 
                }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {(stayType === 'transient' ? DAILY_BUDGETS : MONTHLY_BUDGETS).map(b => (
                  <option key={b.value} value={b.value}>{b.label}</option>
                ))}
              </select>
            </div>

            {/* MUNICIPALITY */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 block mb-1.5">Municipality Preference</label>
              <select 
                value={municipality} 
                onChange={(e) => { setMunicipality(e.target.value); setGenerated(false) }}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            {/* AMENITIES */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 block mb-2">Preferences</label>
              <div className="flex flex-wrap gap-1.5">
                {PREFS.map(p => (
                  <button 
                    key={p} 
                    onClick={() => togglePref(p)}
                    className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${amenityPrefs.includes(p) ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-300' : 'bg-white text-stone-500 border-stone-200'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="p-4 pt-0">
            <button 
              className="w-full px-4 py-2 rounded-lg bg-[--teal] text-white text-sm font-medium flex items-center justify-center gap-1.5 hover:bg-teal-700 transition-colors" 
              onClick={() => setGenerated(true)}
            >
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
            <p className="text-sm mt-1">Try adjusting your preferences or budget.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-[13px] font-semibold text-stone-700">Top Matches for {stayType === 'transient' ? 'Short-term' : 'Long-term'} Stay</h2>
              <Badge variant="teal">{results.length} recommendations</Badge>
            </div>
            {results.map((p, i) => {
              const scoreColor = p.score >= 80 ? '#1D9E75' : p.score >= 60 ? '#BA7517' : '#D85A30'
              const priceDisplay = stayType === 'transient' 
                ? `₱${(p.price_daily || 0).toLocaleString()}/day`
                : `₱${(p.price_monthly || 0).toLocaleString()}/mo`

              return (
                <Card key={p.id} className="flex flex-row items-center gap-2 sm:gap-4 p-2.5 sm:p-4">
                  <div className="text-sm sm:text-2xl font-bold text-stone-200 w-4 sm:w-6 flex-shrink-0 text-center">{i + 1}</div>
                  <div className="w-8 h-8 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl flex items-center justify-center text-lg sm:text-2xl flex-shrink-0 bg-stone-50">🏠</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-[12px] sm:text-[13px] font-semibold text-stone-800 truncate">{p.name}</p>
                      <Badge variant="outline" className="text-[9px] py-0">{priceDisplay}</Badge>
                    </div>
                    <p className="text-[9px] sm:text-[11px] text-stone-400 flex items-center gap-1 mb-1 sm:mb-1.5 truncate">
                      <MapPin className="w-[9px] h-[9px] sm:w-[10px] sm:h-[10px]" /> {p.municipality}
                    </p>
                    <div className="flex items-center gap-1.5 sm:gap-3">
                      <div className="hidden xs:block"><StarRating rating={p.rating || 0} size={10} /></div>
                      <span className="text-[9px] sm:text-[10px] text-stone-400 truncate">{p.available_rooms || 0} rooms</span>
                    </div>
                    {p.amenities && p.amenities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1 sm:mt-1.5 h-[14px] sm:h-auto overflow-hidden">
                        {p.amenities.slice(0, 4).map(a => (
                          <span key={a} className="text-[8px] sm:text-[10px] px-1 sm:px-1.5 py-[1px] sm:py-0.5 bg-[#E1F5EE] text-[#0F6E56] rounded-sm sm:rounded-md whitespace-nowrap">{a}</span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-center flex-shrink-0 w-10 sm:w-20">
                    <p className="font-bold text-lg sm:text-2xl leading-none" style={{ color: scoreColor }}>{p.score}%</p>
                    <p className="text-[8px] sm:text-[10px] text-stone-400 mt-0.5">match</p>
                  </div>
                  <button 
                    className="px-2 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-[--teal] text-white flex-shrink-0 ml-1 sm:ml-0 hover:bg-teal-700 transition-colors" 
                    onClick={() => navigate('/tenant/property/' + p.id)}
                  >
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
