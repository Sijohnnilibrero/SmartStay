import { X, User, MapPin, Mail, Phone, CalendarDays, ShieldCheck, Home, Briefcase, Users, Star, Maximize2 } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState, useEffect } from 'react'
import { Badge, Avatar, StarRating } from './index'
import { useAuthStore } from '@/store/useAuthStore'
import ImageViewerModal from './ImageViewerModal'
import { supabase } from '@/lib/supabase'

export default function TenantProfileModal({ isOpen, onClose, tenantId }) {
  const [profile, setProfile] = useState(null)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewingImage, setViewingImage] = useState(false)
  const fetchUserReviews = useAuthStore(s => s.fetchUserReviews)

  useEffect(() => {
    async function fetchData() {
      if (!tenantId) return
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', tenantId)
          .single()
        
        if (data) {
          setProfile(data)
          const revs = await fetchUserReviews(tenantId)
          setReviews(revs)
        }
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    if (isOpen) fetchData()
  }, [isOpen, tenantId, fetchUserReviews])

  if (!isOpen || !profile) return null

  const initials = profile.full_name
    ? profile.full_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const TYPE_LABELS = { student: 'Student', professional: 'Professional', family: 'Family' }

  // Calculate dynamic stats from reviews since RLS might block homeowner updates to tenant profile
  const totalRev = reviews.length
  const avgRating = totalRev > 0 ? Number((reviews.reduce((acc, r) => acc + r.rating, 0) / totalRev).toFixed(1)) : 0
  const trustScore = Math.min(100, Math.max(0, Math.round(50 + (totalRev * 2) + ((avgRating - 3) * 5))))

  return createPortal(
    <>
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200" onClick={(e) => e.stopPropagation()}>
        
        <div className="h-24 relative" style={{ background: 'linear-gradient(135deg, #BA7517 0%, #D97706 100%)' }}>
          <button 
            onClick={onClose}
            className="absolute top-3 right-3 text-white/80 hover:text-white bg-black/20 hover:bg-black/30 rounded-full p-1 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-6 pb-6 pt-0 relative">
          <div className="flex justify-between items-start mb-6 -mt-10">
            <div className="w-20 h-20 rounded-full border-4 border-white shadow-md bg-white flex items-center justify-center overflow-hidden relative group">
              {profile.avatar_url ? (
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
                  {initials}
                </div>
              )}
            </div>
            
            <div className="mt-10 text-center px-4 py-2 bg-gradient-to-br from-amber-50 to-amber-100/50 rounded-2xl border border-amber-200 shadow-sm">
              <div className="flex items-center justify-center gap-1 mb-0.5">
                <ShieldCheck size={16} className="text-amber-600" />
                <span className="text-[10px] uppercase tracking-wider font-bold text-amber-700">Trust Score</span>
              </div>
              <p className="text-2xl font-black text-amber-600 leading-none">{trustScore}</p>
              {totalRev > 0 && (
                <div className="mt-1 flex items-center justify-center">
                  <StarRating rating={avgRating} size={12} />
                  <span className="text-[10px] text-amber-700 ml-1">({totalRev})</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-stone-800">{profile.full_name || 'Unnamed Tenant'}</h2>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant="teal">{TYPE_LABELS[profile.tenant_type] || 'Tenant'}</Badge>
              <span className="text-sm text-stone-500 flex items-center gap-1">
                <MapPin size={14} /> {profile.municipality || 'Batanes'}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Mail size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Email</p>
                <p className="text-xs font-medium text-stone-700 truncate">{profile.email || 'Not provided'}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 rounded-xl bg-stone-50 border border-stone-100">
              <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0">
                <Phone size={14} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold text-stone-400 uppercase tracking-wider mb-0.5">Contact</p>
                <p className="text-xs font-medium text-stone-700 truncate">{profile.contact || 'Not provided'}</p>
              </div>
            </div>

            {/* Reviews Section */}
            <div className="pt-4 border-t border-stone-100">
              <h3 className="text-sm font-bold text-stone-800 mb-4 flex items-center gap-2">
                <Star size={16} className="text-amber-500" /> 
                Recent Reviews
              </h3>
              
              <div className="space-y-3 overflow-y-auto max-h-[35vh] pr-1">
                {reviews.length === 0 ? (
                  <p className="text-xs text-stone-500 text-center py-4 bg-stone-50 rounded-xl border border-dashed border-stone-200">
                    No reviews yet.
                  </p>
                ) : (
                  reviews.map((rev) => (
                    <div key={rev.id} className="bg-stone-50 p-3 rounded-xl border border-stone-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Avatar url={rev.reviewer?.avatar_url} initials={rev.reviewer?.full_name?.charAt(0) || '?'} size="sm" />
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
    </div>
    
    <ImageViewerModal 
      isOpen={viewingImage} 
      imageUrl={profile.avatar_url} 
      onClose={() => setViewingImage(false)} 
    />
    </>,
    document.body
  )
}
