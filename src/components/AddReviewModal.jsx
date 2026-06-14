import { useState } from 'react'
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
          className={`focus:outline-none transition-colors ${value >= star ? 'text-amber-400' : 'text-stone-200'}`}
        >
          <Star size={size} fill={value >= star ? 'currentColor' : 'none'} />
        </button>
      ))}
    </div>
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-stone-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg overflow-hidden shadow-xl animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-stone-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg text-stone-800">Write a Review</h2>
            <p className="text-xs text-stone-400 mt-0.5">For {propertyName || 'this property'}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-stone-100 flex items-center justify-center text-stone-500 hover:bg-stone-200">
            &times;
          </button>
        </div>

        <div className="p-5 max-h-[70vh] overflow-y-auto">
          {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm mb-4">{error}</div>}
          
          <div className="space-y-5">
            <div className="flex flex-col items-center p-4 bg-stone-50 rounded-xl">
              <p className="text-sm font-semibold text-stone-800 mb-2">Overall Rating *</p>
              <StarInput 
                size={32} 
                value={form.rating} 
                onChange={(val) => setForm({ ...form, rating: val })} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">Cleanliness</p>
                <StarInput size={18} value={form.cleanliness} onChange={(val) => setForm({ ...form, cleanliness: val })} />
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">Location</p>
                <StarInput size={18} value={form.location_score} onChange={(val) => setForm({ ...form, location_score: val })} />
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">Value</p>
                <StarInput size={18} value={form.value} onChange={(val) => setForm({ ...form, value: val })} />
              </div>
              <div>
                <p className="text-xs font-medium text-stone-500 mb-1">Safety</p>
                <StarInput size={18} value={form.safety} onChange={(val) => setForm({ ...form, safety: val })} />
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-stone-800 mb-1">Share your experience</p>
              <textarea
                className="w-full px-3 py-2 border border-stone-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0F6E56]/20 focus:border-[#0F6E56] text-sm resize-none"
                rows="4"
                placeholder="What was it like to stay here?"
                value={form.text}
                onChange={(e) => setForm({ ...form, text: e.target.value })}
              ></textarea>
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-stone-100 flex justify-end gap-3 bg-stone-50/50">
          <button 
            type="button" 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-5 py-2 bg-[#0F6E56] hover:bg-[#0D5C48] text-white text-sm font-medium rounded-xl shadow-sm disabled:opacity-50"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </button>
        </div>
      </div>
    </div>
  )
}
