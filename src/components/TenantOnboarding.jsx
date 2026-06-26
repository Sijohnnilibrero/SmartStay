import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Search, BedDouble, Star, ChevronRight, X, CheckCircle, MapPin, Wallet, Sparkles } from 'lucide-react'

const MUNICIPALITIES = ['Any', 'Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Sabtang', 'Itbayat']
const AMENITIES = ['Any', 'WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry', 'Garden', 'Furnished']

export default function TenantOnboarding() {
  const user = useAuthStore((s) => s.user)
  const saveTenantPreferences = useAuthStore((s) => s.saveTenantPreferences)
  const navigate = useNavigate()
  
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [prefs, setPrefs] = useState({
    municipality: 'Any',
    budget: '2k-3.5k', // value matching Recommendations.jsx
    amenityPrefs: []
  })

  useEffect(() => {
    if (!user || user.role !== 'tenant') return
    const key = `smartstay_onboarded_${user.id}`
    if (!localStorage.getItem(key)) {
      setTimeout(() => setVisible(true), 600)
    }
  }, [user])

  async function dismiss() {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      setExiting(false)
      if (user?.id) localStorage.setItem(`smartstay_onboarded_${user.id}`, '1')
    }, 300)
  }

  async function finishOnboarding() {
    setIsSaving(true)
    try {
      if (user?.id) {
        await saveTenantPreferences(prefs)
        localStorage.setItem(`smartstay_onboarded_${user.id}`, '1')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsSaving(false)
      setExiting(true)
      setTimeout(() => {
        setVisible(false)
        setExiting(false)
      }, 300)
    }
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
  }

  function goSearch() { finishOnboarding().then(() => navigate('/tenant/search')) }
  function goRecommendations() { finishOnboarding().then(() => navigate('/tenant/recommendations')) }

  const toggleAmenity = (a) => {
    setPrefs(p => ({
      ...p,
      amenityPrefs: p.amenityPrefs.includes(a) ? p.amenityPrefs.filter(x => x !== a) : [...p.amenityPrefs, a]
    }))
  }

  if (!visible) return null

  const name = user?.name ? user.name.split(' ')[0] : ''

  const STEPS = [
    {
      icon: '🏝️',
      title: 'Welcome to SmartStay Batanes!',
      subtitle: 'Your home away from home in the northernmost islands of the Philippines.',
      content: () => (
        <div className="space-y-3">
          <p className="text-stone-600 text-sm leading-relaxed">
            Hi <strong className="text-stone-800">{name || 'there'}</strong>! We're glad you joined. SmartStay helps you find quality boarding houses across Batan island.
          </p>
          <div className="bg-gradient-to-br from-[#E1F5EE] to-[#D1FAE5] rounded-2xl p-4 space-y-2">
            {[
              { icon: '🔍', text: 'Browse verified properties' },
              { icon: '📅', text: 'Make and track reservations' },
              { icon: '⭐', text: 'Leave reviews for your stays' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5">
                <span className="text-lg">{item.icon}</span>
                <p className="text-[13px] text-[#0F6E56] font-medium">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: '🗺️',
      title: 'Finding Your Perfect Room',
      subtitle: "Here's how to search and reserve a boarding house.",
      content: () => (
        <div className="space-y-3">
          <div className="space-y-2">
            {[
              { step: '1', icon: <Search size={14} />, title: 'Search & Browse', desc: 'Use the Search page to filter by municipality, price, and amenities.' },
              { step: '2', icon: <BedDouble size={14} />, title: 'View Property Details', desc: 'Tap any property to see photos, room options, and owner info.' },
              { step: '3', icon: <CheckCircle size={14} />, title: 'Make a Reservation', desc: 'Choose your move-in date and duration, then submit your request.' },
              { step: '4', icon: <Star size={14} />, title: 'Leave a Review', desc: 'After your stay, share your experience to help other tenants.' },
            ].map((item) => (
              <div key={item.step} className="flex items-start gap-3 bg-stone-50 rounded-xl p-3">
                <div className="w-7 h-7 rounded-full bg-[#0F6E56] text-white flex items-center justify-center text-[11px] font-bold flex-shrink-0 mt-0.5">
                  {item.step}
                </div>
                <div>
                  <div className="flex items-center gap-1.5 text-stone-800 font-semibold text-[13px]">
                    <span className="text-[#0F6E56]">{item.icon}</span>
                    {item.title}
                  </div>
                  <p className="text-[12px] text-stone-500 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ),
    },
    {
      icon: '📍',
      title: 'Where do you want to live?',
      subtitle: 'Tell us your location and budget preferences.',
      content: () => (
        <div className="space-y-4">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block mb-2 flex items-center gap-1.5">
              <MapPin size={12} /> Municipality
            </label>
            <div className="grid grid-cols-2 gap-2">
              {MUNICIPALITIES.map(m => (
                <button key={m} onClick={() => setPrefs(p => ({ ...p, municipality: m }))}
                  className={`py-2 px-3 text-sm rounded-xl border text-center transition-all ${prefs.municipality === m ? 'bg-[#E1F5EE] border-[#0F6E56] text-[#0F6E56] font-semibold shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-wider text-stone-500 font-semibold block mb-2 flex items-center gap-1.5 mt-2">
              <Wallet size={12} /> Monthly Budget
            </label>
            <div className="flex flex-col gap-2">
              {[
                { val: '1k-2k', label: '₱1,000 – ₱2,000' },
                { val: '2k-3.5k', label: '₱2,000 – ₱3,500' },
                { val: '3.5k+', label: '₱3,500+' }
              ].map(b => (
                <button key={b.val} onClick={() => setPrefs(p => ({ ...p, budget: b.val }))}
                  className={`py-2.5 px-4 text-sm rounded-xl border text-left transition-all ${prefs.budget === b.val ? 'bg-[#E1F5EE] border-[#0F6E56] text-[#0F6E56] font-semibold shadow-sm' : 'bg-white border-stone-200 text-stone-600 hover:border-stone-300'}`}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    },
    {
      icon: '✨',
      title: 'Must-have Amenities',
      subtitle: 'What do you need for a comfortable stay?',
      content: () => (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map(a => (
              <button key={a} onClick={() => toggleAmenity(a)}
                className={`py-2 px-3 text-[13px] rounded-xl border transition-all ${prefs.amenityPrefs.includes(a) ? 'bg-[#0F6E56] border-[#0F6E56] text-white font-medium shadow-md scale-105' : 'bg-white border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                {a}
              </button>
            ))}
          </div>
          <p className="text-[12px] text-stone-400 text-center mt-4">You can select multiple amenities.</p>
        </div>
      )
    },
    {
      icon: '🚀',
      title: "You're all set!",
      subtitle: 'We have saved your preferences.',
      content: null,
      isLast: true,
    },
  ]

  const current = STEPS[step]

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      style={{
        background: 'rgba(0,0,0,0.55)',
        backdropFilter: 'blur(4px)',
        opacity: exiting ? 0 : 1,
        transition: 'opacity 0.3s ease',
      }}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        style={{
          transform: exiting ? 'scale(0.95) translateY(10px)' : 'scale(1) translateY(0)',
          transition: 'transform 0.3s ease',
        }}
      >
        <div
          className="relative px-6 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}
        >
          <div className="text-5xl mb-3 animate-bounce">{current.icon}</div>
          <h2 className="text-white font-bold text-xl leading-tight mb-1">{current.title}</h2>
          <p className="text-white/80 text-[13px]">{current.subtitle}</p>
        </div>

        <div className="flex justify-center gap-1.5 pt-4 px-6">
          {STEPS.map((_, i) => (
            <div key={i} className="rounded-full transition-all duration-300"
              style={{ width: i === step ? 20 : 6, height: 6, background: i === step ? '#0F6E56' : '#E7E5E4' }} />
          ))}
        </div>

        <div className="px-6 pt-4 pb-6">
          {current.content && (
            <div className="mb-5 min-h-[160px]">
              {current.content()}
            </div>
          )}

          {current.isLast ? (
            <div className="space-y-3 mb-5">
              <button onClick={goRecommendations} disabled={isSaving}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5 disabled:opacity-70"
                style={{ background: 'linear-gradient(135deg, #0F6E56, #1D9E75)' }}>
                <Sparkles size={16} /> {isSaving ? 'Saving...' : 'See My Recommendations'}
              </button>
              <button onClick={goSearch} disabled={isSaving}
                className="w-full py-3 rounded-2xl text-stone-600 font-medium text-[13px] border border-stone-200 hover:bg-stone-50 transition-colors">
                Just Browse All Properties
              </button>
            </div>
          ) : (
            <button onClick={next}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #0F6E56, #1D9E75)' }}>
              Continue <ChevronRight size={16} />
            </button>
          )}

          <button onClick={dismiss} className="w-full mt-2 text-[12px] text-stone-400 hover:text-stone-600 transition-colors py-1">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  )
}
