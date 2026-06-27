import { X, Mail, Phone, MapPin, Maximize2, ShieldCheck } from 'lucide-react'
import { createPortal } from 'react-dom'
import { useState } from 'react'
import ImageViewerModal from './ImageViewerModal'

export default function HomeownerProfileModal({ owner, onClose }) {
  const [viewingImage, setViewingImage] = useState(false)

  if (!owner) return null

  const initials = owner.owner_name
    ? owner.owner_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const trustScore = 
    (owner.owner_name ? 25 : 0) + 
    (owner.owner_email ? 25 : 0) + 
    (owner.owner_contact ? 25 : 0) + 
    (owner.owner_avatar ? 25 : 0)

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
              {owner.owner_avatar ? (
                <>
                  <img src={owner.owner_avatar} alt={owner.owner_name} className="w-full h-full object-cover" />
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
              <h3 className="text-lg font-bold text-stone-800">{owner.owner_name}</h3>
              <p className="text-xs text-stone-500 font-medium mb-2">Homeowner</p>
              <div className="inline-flex items-center gap-1.5 bg-[#E1F5EE] text-[#0F6E56] px-2.5 py-1 rounded-full border border-teal-200">
                <ShieldCheck size={14} />
                <span className="text-[11px] font-bold">Trust Score {trustScore}%</span>
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
                  <p className="text-xs font-medium text-stone-700 truncate">{owner.owner_municipality || 'Not provided'}</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
      
      <ImageViewerModal 
        isOpen={viewingImage} 
        imageUrl={owner.owner_avatar} 
        onClose={() => setViewingImage(false)} 
      />
    </>,
    document.body
  )
}
