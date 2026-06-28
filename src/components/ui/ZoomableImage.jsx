import { useState, useRef, useEffect } from 'react'

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
    // Determine scroll direction
    const delta = e.deltaY * -0.005
    const newScale = Math.min(Math.max(1, scale + delta), 5) // Clamp between 1x and 5x zoom
    
    setScale(newScale)
    
    // If zooming back to 1, reset position
    if (newScale === 1) {
      setPosition({ x: 0, y: 0 })
    }
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

  // Double click to reset
  const handleDoubleClick = () => {
    setScale(1)
    setPosition({ x: 0, y: 0 })
  }

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden flex items-center justify-center ${className}`}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onDoubleClick={handleDoubleClick}
      style={{ cursor: scale > 1 ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          userSelect: 'none',
          pointerEvents: 'none' // Let the container handle mouse events
        }}
        className="max-w-full max-h-full object-contain shadow-2xl"
      />
      {scale > 1 && (
        <div className="absolute bottom-4 right-4 bg-black/60 text-white text-[10px] px-3 py-1.5 rounded-full font-medium backdrop-blur-sm pointer-events-none">
          Zoom: {Math.round(scale * 100)}%
        </div>
      )}
    </div>
  )
}
