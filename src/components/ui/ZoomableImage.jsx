import { useState, useRef, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

export function ZoomableImage({ src, alt, className = '' }) {
  const [scale, setScale] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const containerRef = useRef(null)

  // Prevent background scrolling when hovering over the image
  useEffect(() => {
    const preventScroll = (e) => {
      e.preventDefault()
    }
    const container = containerRef.current
    if (container) {
      container.addEventListener('wheel', preventScroll, { passive: false })
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', preventScroll)
      }
    }
  }, [])

  const handleWheel = (e) => {
    const delta = e.deltaY * -0.005
    const newScale = Math.min(Math.max(1, scale + delta), 5) // Clamp between 1x and 5x zoom
    setScale(newScale)
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 })
    }
  }

  const zoomIn = (e) => {
    e?.stopPropagation()
    setScale((prev) => Math.min(5, Number((prev + 0.5).toFixed(1))))
  }

  const zoomOut = (e) => {
    e?.stopPropagation()
    setScale((prev) => {
      const next = Math.max(1, Number((prev - 0.5).toFixed(1)))
      if (next === 1) setPosition({ x: 0, y: 0 })
      return next
    })
  }

  const resetZoom = (e) => {
    e?.stopPropagation()
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  const handleMouseDown = (e) => {
    if (scale <= 1) return // Only allow dragging if zoomed in
    e.preventDefault()
    setIsDragging(true)
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
  }

  const handleMouseMove = (e) => {
    if (!isDragging) return
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    })
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

  // Double click to toggle zoom (1x <-> 2x)
  const handleDoubleClick = () => {
    if (scale > 1) {
      resetZoom()
    } else {
      setScale(2)
    }
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden flex items-center justify-center select-none ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      onClick={(e) => e.stopPropagation()}
      style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0, 0, 1)',
          userSelect: 'none',
          pointerEvents: 'none'
        }}
        className="max-w-full max-h-full object-contain shadow-2xl"
      />

      {/* Floating Toolbar with Zoom Buttons & Drag indicator */}
      <div 
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/80 backdrop-blur-md border border-white/20 text-white shadow-xl z-20 pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={zoomOut}
          disabled={scale <= 1}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut size={16} />
        </button>
        <span className="text-[11px] font-bold min-w-[48px] text-center font-mono">
          {Math.round(scale * 100)}%
        </span>
        <button
          type="button"
          onClick={zoomIn}
          disabled={scale >= 5}
          className="p-1.5 hover:bg-white/20 rounded-full transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn size={16} />
        </button>
        {scale > 1 && (
          <button
            type="button"
            onClick={resetZoom}
            className="p-1.5 hover:bg-white/20 rounded-full transition-colors ml-1 border-l border-white/20 pl-2 cursor-pointer"
            title="Reset Zoom"
          >
            <RotateCcw size={14} />
          </button>
        )}
      </div>

      {/* Quick helper hint on top left */}
      <div className="absolute top-3 left-3 bg-black/60 text-white/90 text-[10px] px-2.5 py-1 rounded-full font-medium backdrop-blur-sm pointer-events-none border border-white/10">
        {scale > 1 ? '🖐️ Click & drag to pan around' : '🔍 Scroll or use controls to zoom'}
      </div>
    </div>
  )
}
