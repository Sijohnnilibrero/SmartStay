import { X, MapPin, Mail, Phone, ShieldCheck, Star, ChevronRight, Maximize2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { Badge, StarRating } from './index'
import { useAuthStore } from '@/store/useAuthStore'
import ImageViewerModal from './ImageViewerModal'
import UserReviewsModal from './UserReviewsModal'
import { supabase } from '@/lib/supabase'

export default function TenantProfileModal({ isOpen, onClose, tenantId }) {
  const [profile, setProfile] = useState(null)
  const [reviewCount, setReviewCount] = useState(0)
  const [avgRating, setAvgRating] = useState(0)
  const [loading, setLoading] = useState(false)
  const [viewingImage, setViewingImage] = useState(false)
  const [showReviews, setShowReviews] = useState(false)
  const fetchUserReviews = useAuthStore(s => s.fetchUserReviews)

  useEffect(() => {
    async function fetchData() {
      if (!tenantId) return
      setLoading(true)
      try {
        const { data } = await supabase.from('profiles').select('*').eq('id', tenantId).single()
        if (data) {
          setProfile(data)
          // Only fetch count/avg here — full list is loaded inside UserReviewsModal
          const revs = await fetchUserReviews(tenantId)
          setReviewCount(revs.length)
          if (revs.length > 0) {
            setAvgRating(Number((revs.reduce((acc, r) => acc + r.rating, 0) / revs.length).toFixed(1)))
          }
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (isOpen) fetchData()
    else { setProfile(null); setReviewCount(0); setAvgRating(0) }
  }, [isOpen, tenantId, fetchUserReviews])

  if (!isOpen) return null

  const initials = profile?.full_name
    ? profile.full_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const TYPE_LABELS = { student: 'Student', professional: 'Professional', family: 'Family' }
  const trustScore = Math.min(100, Math.max(0, Math.round(50 + (reviewCount * 2) + ((avgRating - 3) * 5))))

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      >
        {/* Modal — compact, no growing */}
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-sm flex flex-col animate-in zoom-in-95 duration-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Orange Header Banner */}
          <div
            className="h-24 relative flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #BA7517 0%, #D97706 100%)' }}
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
            {/* Avatar + Trust Score row */}
            <div className="flex justify-between items-start -mt-10 mb-4">
              <div className="w-20 h-20 flex-shrink-0 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center overflow-hidden relative group">
                {profile?.avatar_url ? (
                  <>
                    <img src={profile.avatar_url} alt={profile.full_name} className="w-full h-full object-cover" />
                    <div
                      className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      onClick={() => setViewingImage(true)}
                    >
                      <Maximize2 size={18} className="text-white" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl font-bold bg-[#FAEEDA] text-[#BA7517]">
                    {loading ? '…' : initials}
                  </div>
                )}
              </div>

              <div className="mt-10 text-center px-4 py-2 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border border-amber-200 shadow-sm">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <ShieldCheck size={16} className="text-amber-600" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Trust Score</span>
                </div>
                <p className="text-2xl font-black text-amber-600 leading-none">{loading ? '—' : trustScore}</p>
                {avgRating > 0 && (
                  <div className="mt-1 flex items-center justify-center">
                    <StarRating rating={avgRating} size={12} />
                    <span className="text-[10px] text-amber-700 ml-1">({reviewCount})</span>
                  </div>
                )}
              </div>
            </div>

            {/* Name + Badge */}
            <div className="mb-4">
              <h2 className="text-xl font-bold text-stone-800">{profile?.full_name || (loading ? 'Loading…' : 'Unknown')}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="teal">{TYPE_LABELS[profile?.tenant_type] || 'Tenant'}</Badge>
                <span className="text-sm text-stone-500 flex items-center gap-1">
                  <MapPin size={14} /> {profile?.municipality || 'Batanes'}
                </span>
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Mail size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-xs font-medium text-stone-700 truncate">{profile?.email || 'Not provided'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
                <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <Phone size={14} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Contact</p>
                  <p className="text-xs font-medium text-stone-700 truncate">{profile?.contact || 'Not provided'}</p>
                </div>
              </div>
            </div>

            {/* View Reviews Button */}
            <button
              onClick={() => setShowReviews(true)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-xl border border-amber-100 bg-amber-50 hover:bg-amber-100 transition-colors group"
            >
              <div className="flex items-center gap-2">
                <Star size={15} className="text-amber-500" />
                <span className="text-sm font-semibold text-amber-700">
                  {loading ? 'Reviews' : reviewCount === 0 ? 'No Reviews Yet' : `View ${reviewCount} Review${reviewCount !== 1 ? 's' : ''}`}
                </span>
                {avgRating > 0 && (
                  <span className="text-xs text-amber-500">· ★ {avgRating}</span>
                )}
              </div>
              <ChevronRight size={16} className="text-amber-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </div>
      </div>

      <ImageViewerModal
        isOpen={viewingImage}
        imageUrl={profile?.avatar_url}
        onClose={() => setViewingImage(false)}
      />

      <UserReviewsModal
        isOpen={showReviews}
        onClose={() => setShowReviews(false)}
        userId={tenantId}
        userName={profile?.full_name || 'This User'}
      />
    </>,
    document.body
  )
}
