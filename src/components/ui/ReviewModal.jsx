import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Star } from 'lucide-react'
import { Button } from './index'

export default function ReviewModal({ isOpen, onClose, targetUser, reservationId, onSubmit }) {
  const [rating, setRating] = useState(0)
  const [hoverRating, setHoverRating] = useState(0)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  if (!isOpen || !targetUser) return null

  const handleSubmit = async () => {
    if (rating === 0) return
    setLoading(true)
    try {
      await onSubmit({
        reviewee_id: targetUser.id,
        reservation_id: reservationId,
        rating,
        comment
      })
    } finally {
      setLoading(false)
      onClose()
    }
  }

  return createPortal(
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div 
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-stone-100">
          <h2 className="font-bold text-lg text-stone-800">Rate {targetUser.full_name || targetUser.name || 'User'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-full transition-colors">
            <X size={20} className="text-stone-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="text-center space-y-2">
            <p className="text-sm text-stone-500 font-medium">How was your experience?</p>
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="transition-transform hover:scale-110 active:scale-95"
                >
                  <Star 
                    size={40} 
                    className={`${
                      star <= (hoverRating || rating) 
                        ? 'fill-amber-400 text-amber-400' 
                        : 'fill-stone-100 text-stone-200'
                    } transition-colors`} 
                  />
                </button>
              ))}
            </div>
            {rating > 0 && (
              <p className="text-xs font-bold text-amber-600 uppercase tracking-wide animate-in slide-in-from-top-1">
                {rating === 1 ? 'Terrible' : rating === 2 ? 'Poor' : rating === 3 ? 'Average' : rating === 4 ? 'Good' : 'Excellent'}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-semibold text-stone-700">Add a written review (Optional)</label>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Share details of your experience..."
              className="w-full rounded-xl border-stone-200 focus:border-[--teal] focus:ring-[--teal] text-sm min-h-[100px] resize-none p-3"
            />
          </div>
        </div>

        <div className="p-4 bg-stone-50 border-t border-stone-100 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Cancel</Button>
          <Button 
            onClick={handleSubmit} 
            disabled={rating === 0 || loading}
            className="bg-[--teal] hover:bg-teal-700 text-white"
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  )
}
