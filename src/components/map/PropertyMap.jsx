import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix Leaflet default marker icon broken by bundlers
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
})

// Batanes geographic center
const BATANES_CENTER = [20.4284, 121.9706]
const DEFAULT_ZOOM = 11

// Custom teal pin for available, coral for full
function makeIcon(color = '#1D9E75') {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="28" height="36" viewBox="0 0 28 36">
      <path fill="${color}" stroke="white" stroke-width="1.5"
        d="M14 0C6.27 0 0 6.27 0 14c0 9.33 14 22 14 22S28 23.33 28 14C28 6.27 21.73 0 14 0z"/>
      <circle cx="14" cy="14" r="6" fill="white" opacity="0.9"/>
    </svg>`
  return L.divIcon({
    html: svg,
    className: '',
    iconSize: [28, 36],
    iconAnchor: [14, 36],
    popupAnchor: [0, -36],
  })
}

/**
 * PropertyMap – renders an interactive Leaflet map.
 *
 * Props
 * ─────
 * mode         : 'view'   – show one marker, no click interaction (property detail)
 *              : 'browse' – show multiple markers with popups (tenant search)
 *              : 'pick'   – click to place / move a single marker (add property form)
 *
 * lat / lng    : for 'view' & 'pick' – current marker position
 * properties   : for 'browse' – array of { id, name, address, price_monthly, available_rooms, latitude, longitude }
 * onPick       : for 'pick' – callback(lat, lng) when user clicks map
 * onSelect     : for 'browse' – callback(propertyId) when popup button clicked
 * height       : CSS height string (default '320px')
 */
export default function PropertyMap({
  mode = 'view',
  lat,
  lng,
  properties = [],
  onPick,
  onSelect,
  height = '320px',
}) {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markersRef = useRef([])
  const pickerMarkerRef = useRef(null)
  const bgMarkersRef = useRef([])

  // ── Init map ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return

    const map = L.map(containerRef.current, {
      center: BATANES_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      scrollWheelZoom: mode !== 'view',
    })

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map)

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
    }
  }, [])

  // ── 'view' mode: single static pin ───────────────────────────────
  useEffect(() => {
    if (mode !== 'view' || !mapRef.current) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    if (lat && lng) {
      const marker = L.marker([lat, lng], { icon: makeIcon('#1D9E75'), zIndexOffset: 1000 })
        .addTo(mapRef.current)
      markersRef.current.push(marker)
      mapRef.current.setView([lat, lng], 15)
    } else {
      mapRef.current.setView(BATANES_CENTER, DEFAULT_ZOOM)
    }
  }, [mode, lat, lng])

  // ── 'view' mode: background properties ───────────────────────────
  useEffect(() => {
    if (mode !== 'view' || !mapRef.current) return
    bgMarkersRef.current.forEach((m) => m.remove())
    bgMarkersRef.current = []

    if (properties && properties.length > 0) {
      const pinned = properties.filter((p) => p.latitude && p.longitude && (p.latitude !== lat || p.longitude !== lng))
      pinned.forEach((p) => {
        const icon = makeIcon('#A8A29E') // stone-400
        const popup = L.popup({ className: 'ss-popup-mini', closeButton: false }).setContent(`
          <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:2px;font-size:11px;font-weight:600;color:#57534E;text-align:center;">
            ${p.name}
          </div>
        `)
        
        const marker = L.marker([p.latitude, p.longitude], { icon, opacity: 0.8 })
          .bindPopup(popup)
          .on('mouseover', function() { this.openPopup() })
          .on('mouseout', function() { this.closePopup() })
          .addTo(mapRef.current)
        bgMarkersRef.current.push(marker)
      })
    }
  }, [mode, properties, lat, lng])

  // ── 'browse' mode: multi-pin with popups ─────────────────────────
  useEffect(() => {
    if (mode !== 'browse' || !mapRef.current) return
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    const pinned = properties.filter((p) => p.latitude && p.longitude)
    pinned.forEach((p) => {
      const isFull = (p.available_rooms || 0) === 0
      const isPending = p.status === 'pending_review'
      const isInactive = p.status === 'inactive'
      
      let color = '#1D9E75' // active
      if (isPending) color = '#BA7517'
      else if (isFull || isInactive) color = '#D85A30'

      const icon = makeIcon(color)
      const popup = L.popup({ maxWidth: 220, className: 'ss-popup' }).setContent(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:4px 2px">
          <p style="font-weight:700;font-size:13px;color:#1a1a18;margin:0 0 2px">${p.name}</p>
          <p style="font-size:11px;color:#888780;margin:0 0 6px">📍 ${p.address}</p>
          <p style="font-size:11px;font-weight:500;color:#78716c;background:#f5f5f4;padding:2px 6px;border-radius:4px;display:inline-block;margin:0 0 8px">Prices vary</p>
          <span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:600;background:${isFull ? '#FAECE7' : '#E1F5EE'};color:${isFull ? '#D85A30' : '#0F6E56'}">
            ${isFull ? 'No Available Rooms' : (p.available_rooms) + ' rooms left'}
          </span>
          ${onSelect ? `<br/><button
            onclick="window.__ssSelectProp('${p.id}')"
            style="margin-top:8px;width:100%;padding:6px;border-radius:7px;background:#0F6E56;color:#fff;border:none;cursor:pointer;font-size:12px;font-weight:600">
            View Details →
          </button>` : ''}
        </div>
      `)

      const marker = L.marker([p.latitude, p.longitude], { icon })
        .bindPopup(popup)
        .on('click', () => {
          mapRef.current.setView([p.latitude, p.longitude], 16, { animate: true })
        })
        .addTo(mapRef.current)
      markersRef.current.push(marker)
    })

    // Default to Basco municipality
    const BASCO_CENTER = [20.4485, 121.9708]
    mapRef.current.setView(BASCO_CENTER, 14)
  }, [mode, properties])

  // ── Global handler for popup "View Details" button ────────────────
  useEffect(() => {
    if (mode !== 'browse' || !onSelect) return
    window.__ssSelectProp = (id) => onSelect(id)
    return () => { delete window.__ssSelectProp }
  }, [mode, onSelect])

  // ── 'pick' mode: background properties ────────────────────────────
  useEffect(() => {
    if (mode !== 'pick' || !mapRef.current) return
    bgMarkersRef.current.forEach((m) => m.remove())
    bgMarkersRef.current = []

    const pinned = properties.filter((p) => p.latitude && p.longitude)
    pinned.forEach((p) => {
      // Use a grey, slightly faded icon for background properties
      const icon = makeIcon('#A8A29E') // stone-400
      const popup = L.popup({ className: 'ss-popup-mini', closeButton: false }).setContent(`
        <div style="font-family:'Plus Jakarta Sans',sans-serif;padding:2px;font-size:11px;font-weight:600;color:#57534E;text-align:center;">
          ${p.name}
        </div>
      `)
      
      const marker = L.marker([p.latitude, p.longitude], { icon, opacity: 0.8 })
        .bindPopup(popup)
        .on('mouseover', function() { this.openPopup() })
        .on('mouseout', function() { this.closePopup() })
        .addTo(mapRef.current)
      bgMarkersRef.current.push(marker)
    })
  }, [mode, properties])

  // ── 'pick' mode: clickable pin ────────────────────────────────────
  useEffect(() => {
    if (mode !== 'pick' || !mapRef.current) return

    // Place existing pin if coords already set
    if (lat && lng) {
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng([lat, lng])
      } else {
        pickerMarkerRef.current = L.marker([lat, lng], {
          icon: makeIcon('#1D9E75'),
          draggable: true,
        }).addTo(mapRef.current)
        pickerMarkerRef.current.on('dragend', (e) => {
          const { lat: la, lng: lg } = e.target.getLatLng()
          onPick && onPick(parseFloat(la.toFixed(7)), parseFloat(lg.toFixed(7)))
        })
        mapRef.current.setView([lat, lng], 15)
      }
    }

    const handleClick = (e) => {
      const { lat: la, lng: lg } = e.latlng
      const newLatLng = [parseFloat(la.toFixed(7)), parseFloat(lg.toFixed(7))]
      if (pickerMarkerRef.current) {
        pickerMarkerRef.current.setLatLng(newLatLng)
      } else {
        pickerMarkerRef.current = L.marker(newLatLng, {
          icon: makeIcon('#1D9E75'),
          draggable: true,
        }).addTo(mapRef.current)
        pickerMarkerRef.current.on('dragend', (e2) => {
          const { lat: la2, lng: lg2 } = e2.target.getLatLng()
          onPick && onPick(parseFloat(la2.toFixed(7)), parseFloat(lg2.toFixed(7)))
        })
      }
      onPick && onPick(newLatLng[0], newLatLng[1])
    }

    mapRef.current.on('click', handleClick)
    return () => mapRef.current?.off('click', handleClick)
  }, [mode, lat, lng])

  return (
    <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', height }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
      {mode === 'pick' && (
        <div style={{
          position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(8px)',
          borderRadius: 99, padding: '5px 14px', fontSize: 11,
          color: '#5F5E5A', fontWeight: 500, pointerEvents: 'none',
          boxShadow: '0 1px 8px rgba(0,0,0,0.12)', whiteSpace: 'nowrap',
          zIndex: 1000,
        }}>
          📍 Click or drag pin to set location
        </div>
      )}
    </div>
  )
}
