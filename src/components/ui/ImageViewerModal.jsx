import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export default function ImageViewerModal({ isOpen, imageUrl, onClose }) {
  if (!isOpen || !imageUrl) return null

  return createPortal(
    <div 
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200" 
      onClick={onClose}
    >
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white bg-black/40 hover:bg-black/60 rounded-full p-2 transition-colors z-10"
      >
        <X size={24} />
      </button>
      
      <div 
        className="relative max-w-4xl max-h-[90vh] rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <img 
          src={imageUrl} 
          alt="Expanded view" 
          className="w-full h-full object-contain max-h-[90vh]" 
        />
      </div>
    </div>,
    document.body
  )
}
