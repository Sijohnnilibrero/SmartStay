import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Search, BedDouble, Star, ChevronRight, X, Home, CheckCircle } from 'lucide-react'

const STEPS = [
  {
    icon: '🏝️',
    title: 'Welcome to SmartStay Batanes!',
    subtitle: 'Your home away from home in the northernmost islands of the Philippines.',
    content: (name) => (
      <div className="space-y-3">
        <p className="text-stone-600 text-sm leading-relaxed">
          Hi <strong className="text-stone-800">{name || 'there'}</strong>! We're glad you joined. SmartStay helps you find quality boarding houses across Batan, Sabtang, and Itbayat islands.
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
            { step: '1', icon: <Search size={14} />, title: 'Search & Browse', desc: 'Use the Search page to filter by island, price, and amenities.' },
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
    icon: '🚀',
    title: "You're all set!",
    subtitle: 'Start exploring boarding houses in Batanes.',
    content: null,
    isLast: true,
  },
]

export default function TenantOnboarding() {
  const user = useAuthStore((s) => s.user)
  const navigate = useNavigate()
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    if (!user || user.role !== 'tenant') return
    const key = `smartstay_onboarded_${user.id}`
    if (!localStorage.getItem(key)) {
      // small delay so page loads first
      setTimeout(() => setVisible(true), 600)
    }
  }, [user])

  function dismiss() {
    setExiting(true)
    setTimeout(() => {
      setVisible(false)
      setExiting(false)
      if (user?.id) localStorage.setItem(`smartstay_onboarded_${user.id}`, '1')
    }, 300)
  }

  function next() {
    if (step < STEPS.length - 1) setStep((s) => s + 1)
    else dismiss()
  }

  function goSearch() { dismiss(); navigate('/tenant/search') }
  function goDashboard() { dismiss(); navigate('/tenant') }

  if (!visible) return null

  const current = STEPS[step]
  const name = user?.name ? user.name.split(' ')[0] : ''

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
        {/* Header gradient */}
        <div
          className="relative px-6 pt-8 pb-6 text-center"
          style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}
        >
          <button
            onClick={dismiss}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white hover:bg-white/30 transition-colors"
          >
            <X size={15} />
          </button>
          <div className="text-5xl mb-3 animate-bounce">{current.icon}</div>
          <h2 className="text-white font-bold text-xl leading-tight mb-1">{current.title}</h2>
          <p className="text-white/80 text-[13px]">{current.subtitle}</p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 pt-4 px-6">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === step ? 20 : 6,
                height: 6,
                background: i === step ? '#0F6E56' : '#E7E5E4',
              }}
            />
          ))}
        </div>

        {/* Content */}
        <div className="px-6 pt-4 pb-6">
          {current.content && (
            <div className="mb-5">
              {current.content(name)}
            </div>
          )}

          {current.isLast && (
            <div className="space-y-3 mb-5">
              <button
                onClick={goSearch}
                className="w-full py-3.5 rounded-2xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg, #0F6E56, #1D9E75)' }}
              >
                <Search size={16} /> Browse Properties
              </button>
              <button
                onClick={goDashboard}
                className="w-full py-3 rounded-2xl text-stone-600 font-medium text-[13px] border border-stone-200 hover:bg-stone-50 transition-colors"
              >
                Go to My Dashboard
              </button>
            </div>
          )}

          {!current.isLast && (
            <button
              onClick={next}
              className="w-full py-3.5 rounded-2xl text-white font-semibold text-[14px] flex items-center justify-center gap-2 transition-all hover:shadow-lg hover:-translate-y-0.5"
              style={{ background: 'linear-gradient(135deg, #0F6E56, #1D9E75)' }}
            >
              Continue <ChevronRight size={16} />
            </button>
          )}

          <button onClick={dismiss} className="w-full mt-2 text-[12px] text-stone-400 hover:text-stone-600 transition-colors py-1">
            {current.isLast ? 'Close' : 'Skip for now'}
          </button>
        </div>
      </div>
    </div>
  )
}
