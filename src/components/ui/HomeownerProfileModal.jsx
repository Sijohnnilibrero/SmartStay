import { X, Mail, Phone, MapPin, Maximize2, ShieldCheck, Star } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import ImageViewerModal from './ImageViewerModal'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { Avatar, StarRating } from './index'

export default function HomeownerProfileModal({ owner, onClose }) {
  const [viewingImage, setViewingImage] = useState(false)
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const fetchUserReviews = useAuthStore(s => s.fetchUserReviews)

  useEffect(() => {
    async function fetchData() {
      const targetId = owner?.owner_id || owner?.id
      if (!targetId) return
      
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', targetId)
        .single()
        
      if (data) {
        setProfile(data)
        const revs = await fetchUserReviews(targetId)
        setReviews(revs)
      }
    }
    if (owner) fetchData()
  }, [owner, fetchUserReviews])

  if (!owner) return null

  const initials = owner.owner_name
    ? owner.owner_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const trustScore = profile?.trust_score || 50
  const avgRating = profile?.average_rating || 0
  const totalRev = profile?.total_reviews || 0
  const avatarToUse = profile?.avatar_url || owner.owner_avatar
  const nameToUse = profile?.full_name || owner.owner_name

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
          
          {/* Banner */}
          <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}>
            <button 
              onClick={onClose}
              className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-1 transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Profile Info */}
          <div className="px-6 pb-6 pt-0 relative">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center -mt-10 mx-auto overflow-hidden relative group">
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

            <div className="text-center mt-3 mb-5">
              <h3 className="text-lg font-bold text-stone-800">{nameToUse}</h3>
              <p className="text-xs text-stone-500 font-medium mb-2">Homeowner</p>
              
              <div className="inline-flex flex-col items-center justify-center px-4 py-2 bg-gradient-to-br from-teal-50 to-teal-100/50 rounded-2xl border border-teal-200 shadow-sm">
                <div className="flex items-center justify-center gap-1 mb-0.5">
                  <ShieldCheck size={16} className="text-teal-600" />
                  <span className="text-[10px] uppercase tracking-wider font-bold text-teal-700">Trust Score</span>
                </div>
                <p className="text-2xl font-black text-teal-600 leading-none">{trustScore}</p>
                {avgRating > 0 && (
                  <div className="mt-1 flex items-center justify-center">
                    <StarRating rating={avgRating} size={12} />
                    <span className="text-[10px] text-teal-700 ml-1">({totalRev})</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
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

            {/* Reviews Section */}
            <div className="mt-6 pt-4 border-t border-stone-100">
              <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Star size={16} className="text-teal-500" /> 
                Recent Reviews
              </h3>
              
              <div className="space-y-3">
                {reviews.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    No reviews yet.
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar initials={rev.reviewer?.full_name?.charAt(0) || '?'} size="sm" />
                          <div>
                            <p className="text-xs font-bold text-stone-800">{rev.reviewer?.full_name}</p>
                            <p className="text-[10px] text-stone-400">{new Date(rev.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <StarRating rating={rev.rating} size={12} />
                      </div>
                      {rev.comment && <p className="text-sm text-stone-600 italic">"{rev.comment}"</p>}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>
      </div>
      
      <ImageViewerModal 
        isOpen={viewingImage} 
        imageUrl={avatarToUse} 
        onClose={() => setViewingImage(false)} 
      />
    </>,
    document.body
  )
}
