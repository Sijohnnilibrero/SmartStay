import { useState } from 'react'
import { createPortal } from 'react-dom'
import { X, Download } from 'lucide-react'
import { ZoomableImage } from './ZoomableImage'

export default function ContractViewerModal({ url, onClose }) {

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
          <div className="w-full h-full overflow-hidden flex items-center justify-center">
            <ZoomableImage 
              src={url} 
              alt="Contract" 
              className="w-full h-full" 
            />
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}
