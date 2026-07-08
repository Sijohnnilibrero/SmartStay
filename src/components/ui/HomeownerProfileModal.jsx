import { X, Mail, Phone, MapPin, Maximize2, ShieldCheck, Star, ChevronRight } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import ImageViewerModal from './ImageViewerModal'
import UserReviewsModal from './UserReviewsModal'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { StarRating } from './index'

export default function HomeownerProfileModal({ owner, onClose }) {
  const [viewingImage, setViewingImage] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const [profile, setProfile] = useState(null)
  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const fetchUserReviews = useAuthStore(s => s.fetchUserReviews)

  useEffect(() => {
    async function fetchData() {
      const targetId = owner?.owner_id || owner?.id
      if (!targetId) return
      setLoading(true)
      const { data } = await supabase.from('profiles').select('*').eq('id', targetId).single()
      if (data) setProfile(data)
      // Only fetch count/avg, not the full list (that's for the reviews modal)
      const revs = await fetchUserReviews(targetId)
      setReviewCount(revs.length)
      if (revs.length > 0) {
        setAvgRating(Number((revs.reduce((acc, r) => acc + r.rating, 0) / revs.length).toFixed(1)))
      }
      setLoading(false)
    }
    if (owner) fetchData()
    else { setProfile(null); setReviewCount(0); setAvgRating(0) }
  }, [owner, fetchUserReviews])

  if (!owner) return null

  const initials = owner.owner_name
    ? owner.owner_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const trustScore = Math.min(100, Math.max(0, Math.round(50 + (reviewCount * 2) + ((avgRating - 3) * 5))))
  const avatarToUse = profile?.avatar_url || owner.owner_avatar
  const nameToUse = profile?.full_name || owner.owner_name
  const ownerId = owner?.owner_id || owner?.id

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Modal — compact fixed size since reviews are now separate */}
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Green Header Banner */}
          <div
            className="h-24 relative flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}
          >
            <button
              onClick={onClose}
              className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Profile Info */}
          <div className="px-6 pt-0 pb-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center -mt-10 mx-auto overflow-hidden relative group mb-3">
              {avatarToUse ? (
                <>
                  <img src={avatarToUse} alt={nameToUse} className="w-full h-full object-cover" />
                  <div
                    className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                    onClick={() => setViewingImage(true)}
                  >
                    <Maximize2 size={18} className="text-white" />
                  </div>
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-[#E1F5EE] text-[#0F6E56]">
                  {initials}
                </div>
              )}
            </div>

            {/* Name + Trust Score */}
            <div className="text-center mb-5">
              <h3 className="text-lg font-bold text-stone-800">{nameToUse}</h3>
              <p className="text-xs text-stone-500 font-medium mb-3">Homeowner</p>
              <div className="inline-flex flex-col items-center justify-center px-4 py-2 bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-2xl border border-teal-200 shadow-sm">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <ShieldCheck size={16} className="text-teal-600" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-teal-700">Trust Score</span>
                </div>
                <p className="text-2xl font-black text-teal-600 leading-none">{loading ? '—' : trustScore}</p>
                {avgRating > 0 && (
                  <div className="mt-1 flex items-center justify-center">
                    <StarRating rating={avgRating} size={12} />
                    <span className="text-[10px] text-teal-700 ml-1">({reviewCount})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Contact info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-xs font-medium text-stone-700 truncate">{owner.owner_email || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Contact</p>
                  <p className="text-xs font-medium text-stone-700 truncate">{owner.owner_contact || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center flex-shrink-0">
                  <MapPin size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Municipality</p>
                  <p className="text-xs font-medium text-stone-700 truncate">{profile?.municipality || owner.owner_municipality || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* View Reviews Button */}
            <button
              onClick={() => setShowReviews(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-teal-100 bg-teal-50 hover:bg-teal-100 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Star size={15} className="text-teal-500" />
                <span className="text-sm font-semibold text-teal-700">
                  {loading ? 'Reviews' : reviewCount === 0 ? 'No Reviews Yet' : `View ${reviewCount} Review${reviewCount !== 1 ? 's' : ''}`}
                </span>
                {avgRating > 0 && (
                  <span className="text-xs text-teal-500">· ★ {avgRating}</span>
                )}
              </div>
              <ChevronRight size={16} className="text-teal-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <ImageViewerModal
        isOpen={viewingImage}
        imageUrl={avatarToUse}
        onClose={() => setViewingImage(false)}
      />

      <UserReviewsModal
        isOpen={showReviews}
        onClose={() => setShowReviews(false)}
        userId={ownerId}
        userName={nameToUse}
      />
    </>,
    document.body
  )
}
