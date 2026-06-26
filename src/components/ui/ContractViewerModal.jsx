import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, ZoomIn, ZoomOut, Download } from 'lucide-react'

export default function ContractViewerModal({ url, onClose }) {
  const [scale, setScale] = useState(1)

  if (!url) return null

  const isPdf = url.toLowerCase().includes('.pdf')

  const handleDownload = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch(url)
      const blob = await response.blob()
      const blobUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = blobUrl
      link.download = url.split('/').pop() || 'contract'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(blobUrl)
    } catch (error) {
      console.error('Download failed', error)
      window.open(url, '_blank')
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
        <button 
          onClick={handleDownload}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
          title="Download Contract"
        >
          <Download size={24} />
        </button>
        <button 
          onClick={onClose}
          className="p-2 bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
        >
          <X size={24} />
        </button>
      </div>

      <div className="relative w-full max-w-5xl h-[85vh] bg-stone-900 rounded-xl overflow-hidden flex items-center justify-center border border-white/10 shadow-2xl">
        {isPdf ? (
          <iframe 
            src={url} 
            className="w-full h-full border-0"
            title="Contract PDF Viewer"
          />
        ) : (
          <div className="w-full h-full overflow-auto flex items-center justify-center p-4">
            <div className="relative" style={{ transform: `scale(${scale})`, transformOrigin: 'center center', transition: 'transform 0.2s ease-out' }}>
              <img 
                src={url} 
                alt="Contract" 
                className="max-w-full object-contain rounded shadow-lg"
              />
            </div>
            {/* Zoom Controls for Image */}
            <div className="absolute bottom-6 flex items-center gap-2 bg-black/60 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 shadow-lg">
              <button 
                onClick={() => setScale(s => Math.max(0.5, s - 0.25))}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <ZoomOut size={18} />
              </button>
              <span className="text-white text-xs font-medium min-w-[3rem] text-center">
                {Math.round(scale * 100)}%
              </span>
              <button 
                onClick={() => setScale(s => Math.min(3, s + 0.25))}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
              >
                <ZoomIn size={18} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
