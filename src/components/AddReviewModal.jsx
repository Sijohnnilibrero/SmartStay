import { useState } from 'react'
import { createPortal } from 'react-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Star } from 'lucide-react'

export default function AddReviewModal({ isOpen, onClose, propertyId, propertyName, onReviewAdded }) {
  const createReview = useAuthStore((s) => s.createReview)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const [form, setForm] = useState({
    rating: 0,
    cleanliness: 0,
    location_score: 0,
    value: 0,
    safety: 0,
    text: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.rating === 0) {
      setError('Overall rating is required.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      await createReview({
        property_id: propertyId,
        ...form
      })
      if (onReviewAdded) onReviewAdded()
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  const StarInput = ({ value, onChange, size = 20 }) => (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          onClick={() => onChange(star)}
          className={`focus:outline-none transition-transform hover:scale-110 ${value >= star ? 'text-amber-400' : 'text-stone-300'}`}
        >
          <Star size={size} fill={value >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )

  if (!isOpen) return null

  return createPortal(
    <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-full overflow-hidden">
        
        {/* Header */}
        <div className="relative bg-[#0F6E56] p-6 text-white shrink-0">
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-1 text-[#a3d9c7]">
              <Star size={14} fill="currentColor" />
              <span className="text-[10px] uppercase tracking-wider font-semibold">Review Property</span>
            </div>
            <h2 className="font-bold text-2xl">{propertyName || 'This Property'}</h2>
            <p className="text-sm text-[#d1ece1] mt-1">Your feedback helps others make better decisions.</p>
          </div>
          <button onClick={onClose} className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white hover:bg-white/20 transition-colors">
            &times;
          </button>
          <div className="absolute -top-12 -right-12 w-40 h-40 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {error && <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm mb-5 font-medium">{error}</div>}
          
          <div className="space-y-6">
            {/* Overall Rating */}
            <div className="flex flex-col items-center p-6 bg-gradient-to-b from-stone-50 to-white border border-stone-100 rounded-2xl shadow-sm">
              <p className="text-sm font-bold text-stone-800 mb-3 uppercase tracking-wide">Overall Rating *</p>
              <div className="transform hover:scale-105 transition-transform">
                <StarInput 
                  size={36} 
                  value={form.rating} 
                  onChange={(val) => setForm({ ...form, rating: val })} 
                />
              </div>
            </div>

            {/* Sub-ratings Grid */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Cleanliness', key: 'cleanliness', icon: '✨' },
                { label: 'Location', key: 'location_score', icon: '📍' },
                { label: 'Value', key: 'value', icon: '💎' },
                { label: 'Safety', key: 'safety', icon: '🛡️' }
              ].map((item) => (
                <div key={item.key} className="p-3.5 bg-stone-50 rounded-xl border border-stone-100/50 hover:bg-stone-100/50 transition-colors">
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="text-sm">{item.icon}</span>
                    <p className="text-xs font-semibold text-stone-600">{item.label}</p>
                  </div>
                  <StarInput size={18} value={form[item.key]} onChange={(val) => setForm({ ...form, [item.key]: val })} />
                </div>
              ))}
            </div>

            {/* Text Area */}
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-stone-800 mb-2">
                <span>💬</span> Share your experience
              </label>
              <textarea
                className="w-full p-4 bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] text-sm resize-none transition-all placeholder:text-stone-400"
                rows="4"
                placeholder="What did you love? What could be improved? Help others know what to expect."
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
              ></textarea>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-stone-100 flex justify-end gap-3 bg-stone-50 shrink-0">
          <button 
            type="button" 
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-semibold text-stone-600 hover:text-stone-800 hover:bg-stone-200/50 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 bg-[#0F6E56] hover:bg-[#0D5C48] text-white text-sm font-semibold rounded-xl shadow-md disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )
}
