import { X, Star, ChevronLeft } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { Avatar, StarRating } from './index'
import { useAuthStore } from '@/store/useAuthStore'

export default function UserReviewsModal({ isOpen, onClose, userId, userName }) {
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const fetchUserReviews = useAuthStore(s => s.fetchUserReviews)

  useEffect(() => {
    async function load() {
      if (!userId) return
      setLoading(true)
      try {
        const revs = await fetchUserReviews(userId)
        setReviews(revs)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (isOpen && userId) load()
    else setReviews([])
  }, [isOpen, userId, fetchUserReviews])

  if (!isOpen) return null

  const totalRev = reviews.length
  const avgRating = totalRev > 0
    ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalRev).toFixed(1))
    : 0

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-150"
        style={{ height: '80vh', maxHeight: '560px' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-stone-100 flex-shrink-0">
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-500"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex-1">
            <p className="text-sm font-bold text-stone-800">{userName}'s Reviews</p>
            {totalRev > 0 && !loading && (
              <div className="flex items-center gap-1.5 mt-0.5">
                <StarRating rating={avgRating} size={11} />
                <span className="text-[11px] text-stone-400">{avgRating} · {totalRev} review{totalRev !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-stone-100 transition-colors text-stone-400"
          >
            <X size={16} />
          </button>
        </div>

        {/* Review List — scrollable */}
        <div className="overflow-y-auto flex-1 p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-stone-400">
              <div className="w-6 h-6 border-2 border-stone-200 border-t-teal-500 rounded-full animate-spin" />
              <p className="text-xs">Loading reviews…</p>
            </div>
          ) : reviews.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-stone-400">
              <div className="w-14 h-14 rounded-full bg-stone-50 flex items-center justify-center">
                <Star size={24} className="opacity-30" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-stone-500">No reviews yet</p>
                <p className="text-xs text-stone-400 mt-0.5">This user hasn't been reviewed yet.</p>
              </div>
            </div>
          ) : (
            reviews.map((rev) => (
              <div key={rev.id} className="bg-stone-50 rounded-xl border border-stone-100 p-4">
                {/* Reviewer row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <Avatar
                      url={rev.reviewer?.avatar_url}
                      initials={rev.reviewer?.full_name?.charAt(0) || '?'}
                      size="sm"
                    />
                    <div>
                      <p className="text-xs font-bold text-stone-800">{rev.reviewer?.full_name || 'Unknown'}</p>
                      <p className="text-[10px] text-stone-400">
                        {new Date(rev.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  <StarRating rating={rev.rating} size={13} />
                </div>

                {/* Comment */}
                {rev.comment ? (
                  <p className="text-sm text-stone-600 italic leading-relaxed">"{rev.comment}"</p>
                ) : (
                  <p className="text-xs text-stone-400 italic">No written comment.</p>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
