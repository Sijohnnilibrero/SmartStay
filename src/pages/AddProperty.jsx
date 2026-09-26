import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import Topbar from '@/components/layout/Topbar'
import { Button, Card, Input } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import PropertyMap from '@/components/map/PropertyMap'
import { MapPin, ImagePlus, X, Upload, Loader2, Plus, BedDouble, Trash2, Home, CheckCircle2, ChevronRight, ChevronLeft, AlertCircle, Edit2, CheckCircle, Eye } from 'lucide-react'
import ImageViewerModal from '@/components/ui/ImageViewerModal'
import { formatCurrency } from '@/lib/utils'

const MUNICIPALITIES = ['Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Sabtang', 'Itbayat']
const AMENITY_OPTIONS = ['WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry', 'Garden']
const PLACEHOLDER_IMAGES = ['/images/property_1.png', '/images/property_2.png', '/images/property_3.png']
const ROOM_AMENITY_OPTIONS = ['WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry']
const EMPTY_ROOM_FORM = { room_number: '', floor: 1, price_monthly: '', price_daily: '', amenities: [], notes: '', is_available: true, image_urls: [] }

var EMPTY_FORM = {
  name: '', description: '', address: '', municipality: 'Basco', island: 'Batan',
  house_number: '', street: '', barangay: '', landmark: '',
  total_rooms: '', amenities: [],
  latitude: null, longitude: null, image_url: null, permit_urls: [], permit_expires_on: '',
  accepts_long_term: true, accepts_transient: false, status: 'pending_review'
}

// ── Inline Room Image Uploader (for Edit tab) ──────────────────────────────
function RoomImagesUploader({ existingUrls, setExistingUrls, newFiles, setNewFiles }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)
  const addToast = useAppStore(s => s.addToast)

  function handleFiles(files) {
    if (!files || files.length === 0) return
    const valid = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
    if (valid.length < files.length) addToast('Some files ignored — images only, max 5 MB.', 'error')
    setNewFiles(prev => [...prev, ...valid])
  }

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">
        Room Photos <span className="text-stone-300 normal-case font-normal">(optional)</span>
      </label>
      <div className="flex flex-wrap gap-2 mb-2">
        {existingUrls.map((url, i) => (
          <div key={`e${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-stone-200">
            <img src={url} alt="" className="w-full h-full object-cover" />
            <button type="button" onClick={() => setExistingUrls(p => p.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={10} />
            </button>
          </div>
        ))}
        {newFiles.map((file, i) => (
          <div key={`n${i}`} className="relative w-20 h-20 rounded-lg overflow-hidden group border-2 border-teal-200">
            <img src={URL.createObjectURL(file)} alt="" className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1 bg-teal-600 text-white text-[8px] px-1 rounded">NEW</div>
            <button type="button" onClick={() => setNewFiles(p => p.filter((_, j) => j !== i))}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={10} />
            </button>
          </div>
        ))}
        <div
          onDragOver={e => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={e => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className={`w-20 h-20 flex-shrink-0 rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-1 transition-all ${
            drag ? 'border-teal-400 bg-teal-50' : 'border-stone-200 bg-stone-50 hover:border-teal-300 hover:bg-teal-50'
          }`}>
          <ImagePlus size={16} className="text-stone-300" />
          <p className="text-[9px] text-stone-400">Add</p>
        </div>
      </div>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  )
}

// ── Step indicator ──────────────────────────────────────────────────────────
function StepIndicator({ step, isEdit }) {
  const steps = isEdit
    ? [{ label: 'Property Info', icon: '🏠' }]
    : [{ label: 'Property Info', icon: '🏠' }, { label: 'Room Setup', icon: '🛏️' }, { label: 'Review & Submit', icon: '✅' }]

  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((s, i) => {
        const active  = i === step
        const done    = i < step
        return (
          <div key={i} className="flex items-center">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold transition-all ${
              active ? 'bg-teal-600 text-white shadow-md' :
              done   ? 'bg-teal-100 text-teal-700' :
                       'bg-stone-100 text-stone-400'
            }`}>
              <span>{s.icon}</span>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-0.5 mx-1 transition-all ${done ? 'bg-teal-400' : 'bg-stone-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function AddProperty() {
  var navigate = useNavigate()
  var params = useParams()
  var propertyId = params.id
  var isEdit = !!propertyId

  var createProperty       = useAuthStore(s => s.createProperty)
  var updateProperty       = useAuthStore(s => s.updateProperty)
  var fetchProperty        = useAuthStore(s => s.fetchProperty)
  var uploadPropertyImage  = useAuthStore(s => s.uploadPropertyImage)
  var uploadPropertyPermit = useAuthStore(s => s.uploadPropertyPermit)
  var createRoom           = useAuthStore(s => s.createRoom)
  var updateRoom           = useAuthStore(s => s.updateRoom)
  var deleteRoom           = useAuthStore(s => s.deleteRoom)
  var fetchRooms           = useAuthStore(s => s.fetchRooms)
  var uploadRoomImages     = useAuthStore(s => s.uploadRoomImages)
  var isLoading            = useAuthStore(s => s.isLoading)
  var user                 = useAuthStore(s => s.user)
  var fetchProperties      = useAuthStore(s => s.fetchProperties)
  var addToast             = useAppStore(s => s.addToast)
  var systemConfirm        = useAppStore(s => s.systemConfirm)

  // ── Tab state (edit mode only) ──
  var [activeTab, setActiveTab]         = useState('details') // 'details' | 'rooms'
  // ── Room management state (edit mode) ──
  var [rooms, setRooms]                 = useState([])
  var [roomsLoading, setRoomsLoading]   = useState(false)
  var [showRoomForm, setShowRoomForm]   = useState(false)
  var [editingRoom, setEditingRoom]     = useState(null)
  var [roomForm, setRoomForm]           = useState(EMPTY_ROOM_FORM)
  var [roomNewFiles, setRoomNewFiles]   = useState([])
  var [roomExistingUrls, setRoomExistingUrls] = useState([])
  var [roomActioning, setRoomActioning] = useState(null)
  var [roomUploading, setRoomUploading] = useState(false)

  // ── State ──
  var [step, setStep]               = useState(0)
  var [error, setError]             = useState('')
  var [form, setForm]               = useState(EMPTY_FORM)
  var [imageFile, setImageFile]     = useState(null)
  var [imagePreview, setImagePreview] = useState(null)
  var [permitFiles, setPermitFiles] = useState([])
  var [uploading, setUploading]     = useState(false)
  var [dragOver, setDragOver]       = useState(false)
  var [permitPreviewModal, setPermitPreviewModal] = useState(false)
  var [activePermitPreview, setActivePermitPreview] = useState(null)
  var [viewingImage, setViewingImage] = useState(null)
  var [otherProperties, setOtherProperties] = useState([])
  var [roomDrafts, setRoomDrafts]   = useState([])
  var fileInputRef = useRef(null)

  // ── Load rooms for edit tab ──
  const loadRooms = useCallback(function(silent = false) {
    if (!isEdit || !propertyId) return
    if (!silent) setRoomsLoading(true)
    fetchRooms(propertyId)
      .then(r => { setRooms(r || []); if (!silent) setRoomsLoading(false) })
      .catch(() => { if (!silent) setRoomsLoading(false) })
  }, [isEdit, propertyId, fetchRooms])

  useEffect(() => { if (isEdit) loadRooms() }, [loadRooms, isEdit])

  // ── Load existing property if editing ──
  useEffect(function() {
    fetchProperties({ status: 'active' })
      .then(function(data) {
        setOtherProperties(data.filter(p => String(p.id) !== String(propertyId)))
      }).catch(() => {})
  }, [fetchProperties, propertyId])

  useEffect(function() {
    if (!isEdit) return
    fetchProperty(propertyId).then(function(p) {
      setForm({
        name: p.name || '', description: p.description || '', address: p.address || '',
        house_number: p.house_number || '', street: p.street || '', barangay: p.barangay || '',
        landmark: p.landmark || '', municipality: p.municipality || 'Basco', island: p.island || 'Batan',
        total_rooms: p.total_rooms != null ? String(p.total_rooms) : '',
        amenities: p.amenities || [], latitude: p.latitude || null, longitude: p.longitude || null,
        image_url: p.image_url || null,
        permit_urls: p.permit_urls || (p.permit_url ? [p.permit_url] : []),
        permit_expires_on: p.permit_expires_on || '',
        accepts_long_term: p.accepts_long_term !== false, accepts_transient: !!p.accepts_transient,
        status: p.status || 'pending_review'
      })
      if (p.image_url) setImagePreview(p.image_url)
    }).catch(err => setError('Failed to load property: ' + (err.message || err)))
  }, [propertyId, isEdit])

  // ── Helpers ──
  function set(key, val) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function handleTotalRoomsChange(e) {
    const val = parseInt(e.target.value) || 0
    set('total_rooms', val ? String(val) : '')
    if (!isEdit) {
      setRoomDrafts(prev => {
        if (val > prev.length) {
          return [
            ...prev,
            ...Array(val - prev.length).fill().map((_, i) => ({
              id: Date.now() + i,
              room_number: `${prev.length + i + 1}`,
              floor: 1, price_monthly: '', price_daily: '',
              amenities: [], notes: '', is_available: true,
              imageFiles: [], imagePreviews: [],
            }))
          ]
        } else {
          return prev.slice(0, val)
        }
      })
    }
  }

  function toggleAmenity(a) {
    setForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a]
    }))
  }

  async function handlePickLocation(lat, lng) {
    setForm(f => ({ ...f, latitude: lat, longitude: lng }))
    try {
      var res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      var data = await res.json()
      if (data?.address) {
        setForm(f => {
          var next = { ...f }
          var st = data.address.road || data.address.pedestrian
          if (st) next.street = st
          var brgy = data.address.village || data.address.suburb || data.address.neighbourhood
          if (brgy) next.barangay = brgy
          var muni = data.address.town || data.address.city || data.address.municipality || data.address.county
          if (muni) {
            var m = muni.replace('Municipality of ', '')
            if (MUNICIPALITIES.includes(m)) {
              next.municipality = m
              next.island = m === 'Sabtang' ? 'Sabtang' : m === 'Itbayat' ? 'Itbayat' : 'Batan'
            }
          }
          return next
        })
      }
    } catch (err) { console.error('Geocoding failed:', err) }
  }

  function handleFileSelect(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file (JPG, PNG, or WEBP).'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function handleDrop(e) {
    e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0])
  }

  function removeImage() {
    setImageFile(null); setImagePreview(null); set('image_url', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Room Draft Helpers ──
  function updateRoomDraft(idx, key, val) {
    setRoomDrafts(prev => { var next = [...prev]; next[idx] = { ...next[idx], [key]: val }; return next })
  }

  function toggleRoomDraftAmenity(idx, a) {
    setRoomDrafts(prev => {
      var next = [...prev]
      var amens = next[idx].amenities || []
      next[idx] = { ...next[idx], amenities: amens.includes(a) ? amens.filter(x => x !== a) : [...amens, a] }
      return next
    })
  }

  function handleRoomDraftImages(idx, files) {
    if (!files || files.length === 0) return
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
    if (validFiles.length < files.length) addToast('Some files ignored. Max 5 MB images only.', 'error')
    setRoomDrafts(prev => {
      var next = [...prev]
      next[idx] = {
        ...next[idx],
        imageFiles: [...(next[idx].imageFiles || []), ...validFiles],
        imagePreviews: [...(next[idx].imagePreviews || []), ...validFiles.map(f => URL.createObjectURL(f))]
      }
      return next
    })
  }

  function removeRoomDraftImage(rIdx, iIdx) {
    setRoomDrafts(prev => {
      var next = [...prev]
      next[rIdx] = {
        ...next[rIdx],
        imageFiles: next[rIdx].imageFiles.filter((_, i) => i !== iIdx),
        imagePreviews: next[rIdx].imagePreviews.filter((_, i) => i !== iIdx)
      }
      return next
    })
  }

  // ── Edit Mode Room Handlers ──
  function openAddRoom() {
    setEditingRoom(null)
    setRoomForm(EMPTY_ROOM_FORM)
    setRoomNewFiles([])
    setRoomExistingUrls([])
    setShowRoomForm(true)
  }

  function openEditRoom(room) {
    setEditingRoom(room.id)
    setRoomForm({
      room_number: room.room_number || '',
      floor: room.floor || 1,
      price_monthly: room.price_monthly != null ? String(room.price_monthly) : '',
      price_daily: room.price_daily != null ? String(room.price_daily) : '',
      amenities: room.amenities || [],
      notes: room.notes || '',
      is_available: room.is_available !== false,
      image_urls: room.image_urls || []
    })
    setRoomExistingUrls(room.image_urls || [])
    setRoomNewFiles([])
    setShowRoomForm(true)
  }

  function closeRoomForm() {
    setShowRoomForm(false)
    setEditingRoom(null)
    setRoomNewFiles([])
    setRoomExistingUrls([])
  }

  function setRoomField(key, val) {
    setRoomForm(f => ({ ...f, [key]: val }))
  }

  function toggleRoomAmenity(a) {
    setRoomForm(f => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter(x => x !== a) : [...f.amenities, a]
    }))
  }

  async function handleSaveRoom(e) {
    if (e) e.preventDefault()
    if (!roomForm.room_number.trim()) {
      addToast('Please provide a Room Number.', 'error')
      return
    }
    if (form.accepts_long_term && !form.accepts_transient && (!roomForm.price_monthly || parseFloat(roomForm.price_monthly) <= 0)) {
      addToast('Please enter a valid Monthly Price (₱ > 0).', 'error')
      return
    }
    if (form.accepts_transient && !form.accepts_long_term && (!roomForm.price_daily || parseFloat(roomForm.price_daily) <= 0)) {
      addToast('Please enter a valid Daily Price (₱ > 0).', 'error')
      return
    }
    if (form.accepts_long_term && form.accepts_transient && (!roomForm.price_monthly || parseFloat(roomForm.price_monthly) <= 0) && (!roomForm.price_daily || parseFloat(roomForm.price_daily) <= 0)) {
      addToast('Please provide at least a Monthly or Daily Price.', 'error')
      return
    }

    let finalUrls = [...roomExistingUrls]
    if (roomNewFiles.length > 0) {
      setRoomUploading(true)
      try {
        const uploaded = await uploadRoomImages(roomNewFiles, editingRoom || 'new')
        finalUrls = [...finalUrls, ...uploaded]
      } catch (err) {
        addToast('Upload failed: ' + (err.message || err), 'error')
        setRoomUploading(false)
        return
      }
      setRoomUploading(false)
    }

    const payload = {
      property_id: propertyId,
      owner_id: user?.id,
      room_number: roomForm.room_number.trim(),
      floor: parseInt(roomForm.floor) || 1,
      price_monthly: parseFloat(roomForm.price_monthly) || 0,
      price_daily: parseFloat(roomForm.price_daily) || null,
      amenities: roomForm.amenities || [],
      notes: roomForm.notes || '',
      is_available: roomForm.is_available,
      image_urls: finalUrls,
    }

    try {
      if (editingRoom) {
        await updateRoom(editingRoom, payload)
        addToast('Room updated successfully!', 'success')
      } else {
        await createRoom(payload)
        addToast('Room added successfully!', 'success')
      }
      closeRoomForm()
      loadRooms(true)
    } catch (err) {
      addToast(err.message || 'Failed to save room.', 'error')
    }
  }

  async function handleDeleteRoom(id) {
    if (!(await systemConfirm('Are you sure you want to delete this room?'))) return
    setRoomActioning(id)
    try {
      await deleteRoom(id)
      addToast('Room deleted successfully!', 'success')
      loadRooms(true)
    } catch (err) {
      addToast(err.message || 'Failed to delete room.', 'error')
    } finally {
      setRoomActioning(null)
    }
  }

  async function handleToggleRoomAvailability(room) {
    setRoomActioning(room.id)
    try {
      await updateRoom(room.id, { is_available: !room.is_available })
      loadRooms(true)
      addToast(`Room ${room.room_number} is now ${!room.is_available ? 'available' : 'occupied'}.`, 'success')
    } catch (err) {
      addToast(err.message || 'Failed to toggle room status.', 'error')
    } finally {
      setRoomActioning(null)
    }
  }

  // ── Step 0 Validation ──
  function validateStep0() {
    setError('')
    if (!form.name.trim()) { setError('Please enter a Property Name.'); return false }
    if (!form.street.trim()) { setError('Please enter the Street Name.'); return false }
    if (!form.barangay.trim()) { setError('Please enter the Barangay.'); return false }
    if (!form.accepts_long_term && !form.accepts_transient) {
      setError('Please select who you cater to (Long-term Boarders or Transients).')
      return false
    }
    if (!isEdit && permitFiles.length === 0 && (!form.permit_urls || form.permit_urls.length === 0)) {
      setError('Please upload at least one Business Permit document.')
      return false
    }
    if ((permitFiles.length > 0 || (form.permit_urls && form.permit_urls.length > 0)) && !form.permit_expires_on) {
      setError('Please provide the permit expiration date.')
      return false
    }
    if (!isEdit && (!form.total_rooms || parseInt(form.total_rooms) < 1)) {
      setError('Please enter the total number of rooms (at least 1).')
      return false
    }
    return true
  }

  // ── Step 1 Validation ──
  function validateStep1() {
    setError('')
    for (const r of roomDrafts) {
      if (!r.room_number) { setError('Please provide a Room # for all rooms.'); return false }
      if (form.accepts_long_term && !form.accepts_transient && (!r.price_monthly || parseFloat(r.price_monthly) <= 0)) {
        setError(`Room #${r.room_number}: Please provide a valid Monthly Price (₱ > 0).`); return false
      }
      if (form.accepts_transient && !form.accepts_long_term && (!r.price_daily || parseFloat(r.price_daily) <= 0)) {
        setError(`Room #${r.room_number}: Please provide a valid Daily Price (₱ > 0).`); return false
      }
      if (form.accepts_long_term && form.accepts_transient &&
          (!r.price_monthly || parseFloat(r.price_monthly) <= 0) && (!r.price_daily || parseFloat(r.price_daily) <= 0)) {
        setError(`Room #${r.room_number}: Please provide at least a Monthly or Daily Price.`); return false
      }
    }
    return true
  }

  function goToStep1() {
    if (validateStep0()) {
      setStep(1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function goToStep2() {
    if (validateStep1()) {
      setStep(2)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // ── Final Submit ──
  async function handleSubmit(e) {
    if (e) e.preventDefault()
    setError('')

    if (!validateStep0()) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }

    var imageUrl = form.image_url
    if (imageFile) {
      setUploading(true)
      try { imageUrl = await uploadPropertyImage(imageFile, propertyId || 'new') }
      catch (err) { setError('Image upload failed: ' + (err.message || err)); setUploading(false); return }
      setUploading(false)
    }

    var permitUrls = form.permit_urls || []
    if (permitFiles.length > 0) {
      setUploading(true)
      try {
        const uploaded = await uploadPropertyPermit(permitFiles, propertyId || 'new')
        permitUrls = [...permitUrls, ...uploaded]
      } catch (err) { setError('Permit upload failed: ' + (err.message || err)); setUploading(false); return }
      setUploading(false)
    }

    var parsedRooms = parseInt(form.total_rooms)
    if (isNaN(parsedRooms) || parsedRooms < 1) {
      parsedRooms = rooms.length > 0 ? rooms.length : 1
    }

    var payload = {
      ...form,
      name: form.name.trim(),
      description: form.description.trim(),
      address: `${form.house_number ? form.house_number.trim() + ' ' : ''}${form.street ? form.street.trim() + ', ' : ''}${form.barangay ? 'Brgy. ' + form.barangay.trim() : ''}`.trim().replace(/,$/, ''),
      house_number: form.house_number.trim(), street: form.street.trim(),
      barangay: form.barangay.trim(), landmark: form.landmark.trim(),
      price_monthly: 0,
      total_rooms: parsedRooms,
      amenities: form.amenities, latitude: form.latitude, longitude: form.longitude,
      location: form.latitude && form.longitude
        ? 'SRID=4326;POINT(' + form.longitude + ' ' + form.latitude + ')' : null,
      image_url: imageUrl, permit_urls: permitUrls,
      permit_expires_on: form.permit_expires_on || null,
      accepts_long_term: form.accepts_long_term, accepts_transient: form.accepts_transient,
    }

    setUploading(true)
    try {
      var result = await (isEdit ? updateProperty(propertyId, payload) : createProperty(payload))
      const finalPropertyId = isEdit ? propertyId : result.id

      if (!isEdit && roomDrafts.length > 0) {
        await Promise.all(roomDrafts.map(async (draft, index) => {
          let finalUrls = []
          if (draft.imageFiles?.length > 0) {
            finalUrls = await uploadRoomImages(draft.imageFiles, 'new_' + index)
          }
          await createRoom({
            property_id: finalPropertyId, owner_id: user?.id,
            room_number: draft.room_number, floor: parseInt(draft.floor) || 1,
            price_monthly: parseFloat(draft.price_monthly) || 0,
            price_daily: parseFloat(draft.price_daily) || null,
            amenities: draft.amenities, notes: draft.notes,
            is_available: draft.is_available, image_urls: finalUrls,
          })
        }))
      }
      addToast(isEdit ? 'Property updated successfully!' : 'Property submitted successfully!', 'success')
      navigate('/owner/properties')
    } catch (err) {
      setError(err.message || (isEdit ? 'Failed to update property.' : 'Failed to create property.'))
    } finally {
      setUploading(false)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 0 — Property Info
  // ─────────────────────────────────────────────────────────────────────────
  function renderStep0() {
    return (
      <div className="space-y-6">
        {/* Photo Upload */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-2">
            Property Photo <span className="text-stone-300 normal-case tracking-normal font-normal">(optional)</span>
          </label>
          {imagePreview ? (
            <div className="relative rounded-2xl overflow-hidden group border border-stone-200">
              <img src={imagePreview} alt="Property preview" className="w-full h-52 object-cover" />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all flex items-center justify-center gap-3 opacity-0 group-hover:opacity-100">
                <button type="button" onClick={() => fileInputRef.current?.click()} className="bg-white text-stone-700 text-[12px] font-medium px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-stone-50 shadow-sm">
                  <Upload size={13} /> Change
                </button>
                <button type="button" onClick={removeImage} className="bg-red-500 text-white text-[12px] font-medium px-3 py-2 rounded-xl flex items-center gap-1.5 hover:bg-red-600 shadow-sm">
                  <X size={13} /> Remove
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative h-44 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${dragOver ? 'border-teal-400 bg-teal-50' : 'border-stone-200 bg-stone-50 hover:border-teal-300 hover:bg-teal-50/30'}`}
            >
              <div className="text-center">
                <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mx-auto mb-2 shadow-sm">
                  <ImagePlus size={18} className="text-stone-400" />
                </div>
                <p className="text-[13px] font-medium text-stone-600">Click or drag photo</p>
                <p className="text-[10px] text-stone-400 mt-0.5">JPG, PNG, WEBP (max 5MB)</p>
              </div>
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={e => handleFileSelect(e.target.files[0])} />
        </div>

        {/* Stay Types */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-2">Who do you cater to? *</label>
          <div className="flex flex-col sm:flex-row gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.accepts_long_term} onChange={e => set('accepts_long_term', e.target.checked)} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" />
              <span className="text-sm font-medium text-stone-700">Long-term Boarders (Monthly)</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.accepts_transient} onChange={e => set('accepts_transient', e.target.checked)} className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500" />
              <span className="text-sm font-medium text-stone-700">Short-term Transients (Daily)</span>
            </label>
          </div>
          {!form.accepts_long_term && !form.accepts_transient && (
            <p className="text-[10px] text-red-500 mt-1">Please select at least one.</p>
          )}
        </div>

        {/* Business Permit */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
              Business Permit Documents {isEdit ? <span className="text-stone-300 normal-case font-normal">(Already uploaded)</span> : <span className="text-red-400">*</span>}
            </label>
            <button type="button" onClick={() => document.getElementById('permit_upload_input').click()} className="text-[10px] bg-teal-50 text-teal-700 px-2.5 py-1 rounded-md font-semibold hover:bg-teal-100 flex items-center gap-1 transition-colors">
              <Plus size={10} /> Add Permit File
            </button>
          </div>
          <input id="permit_upload_input" type="file" multiple accept="application/pdf,image/jpeg,image/png,image/webp"
            onChange={e => setPermitFiles([...permitFiles, ...Array.from(e.target.files)])} className="hidden" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            {form.permit_urls?.map((url, idx) => (
              <div key={'ex-'+idx} className="flex items-center gap-3 p-2 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-teal-300 transition-all" onClick={() => setViewingImage(url)}>
                <div className={`w-10 h-10 rounded-lg flex-shrink-0 flex items-center justify-center ${form.status === 'active' ? 'bg-teal-50 text-teal-600' : 'bg-amber-50 text-amber-600'}`}>
                  {form.status === 'active' ? <CheckCircle2 size={16} /> : <Loader2 size={16} className="animate-spin" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-stone-700 truncate">Existing Permit {idx+1}</p>
                  <p className="text-[9px] text-teal-600 mt-0.5">{form.status === 'active' ? 'Verified' : 'Under Review'}</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); set('permit_urls', form.permit_urls.filter((_, i) => i !== idx)) }} className="p-1.5 text-stone-400 hover:text-red-500 rounded-md">
                  <X size={12} />
                </button>
              </div>
            ))}
            {permitFiles.map((pFile, idx) => (
              <div key={'new-'+idx} className="flex items-center gap-3 p-2 bg-white border border-teal-100 rounded-xl cursor-pointer hover:border-teal-300 group" onClick={() => { setActivePermitPreview(pFile); setPermitPreviewModal(true) }}>
                <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                  {pFile.type.startsWith('image/') ? <img src={URL.createObjectURL(pFile)} className="w-full h-full object-cover" alt="" /> : <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-stone-500">PDF</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-medium text-stone-700 truncate">{pFile.name}</p>
                  <p className="text-[9px] text-teal-600 mt-0.5 flex items-center gap-1"><CheckCircle2 size={10} /> Ready to upload</p>
                </div>
                <button type="button" onClick={e => { e.stopPropagation(); setPermitFiles(permitFiles.filter((_, i) => i !== idx)) }} className="p-1.5 text-stone-400 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"><X size={12} /></button>
              </div>
            ))}
          </div>
          {!isEdit && permitFiles.length === 0 && (!form.permit_urls || form.permit_urls.length === 0) && (
            <p className="text-[10px] text-stone-400 mt-2">PDF or Image required to list property</p>
          )}
          {(permitFiles.length > 0 || isEdit || (form.permit_urls && form.permit_urls.length > 0)) && (
            <div className="mt-4">
              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1">Permit Expiration Date <span className="text-red-400">*</span></label>
              <input type="date" value={form.permit_expires_on} onChange={e => set('permit_expires_on', e.target.value)}
                className="w-full sm:w-1/2 px-3 py-1.5 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all" />
            </div>
          )}
        </div>

        {/* Property Name */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Property Name *</label>
          <input value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Casa Ivatan Bed & Board"
            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all" />
        </div>

        {/* Description */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Description</label>
          <textarea rows={3} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your property..."
            className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all resize-none" />
        </div>

        {/* Address */}
        <div className="space-y-3">
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block">Detailed Address *</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.house_number} onChange={e => set('house_number', e.target.value)} placeholder="House/Building No."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all" />
            <input value={form.street} onChange={e => set('street', e.target.value)} placeholder="Street Name *"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.barangay} onChange={e => set('barangay', e.target.value)} placeholder="Barangay *"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all" />
            <input value={form.landmark} onChange={e => set('landmark', e.target.value)} placeholder="Nearest Landmark / Directions"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all" />
          </div>
        </div>

        {/* Municipality + Total Rooms */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Municipality *</label>
            <select value={form.municipality} onChange={e => {
                var m = e.target.value
                setForm(f => ({ ...f, municipality: m, island: m === 'Sabtang' ? 'Sabtang' : m === 'Itbayat' ? 'Itbayat' : 'Batan' }))
              }} className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30">
              {MUNICIPALITIES.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {!isEdit && (
            <div>
              <label className="text-[11px] uppercase tracking-wider text-teal-600 font-bold block mb-1.5">Total Rooms *</label>
              <input type="number" min="1" max="50" value={form.total_rooms} onChange={handleTotalRoomsChange} placeholder="e.g. 5"
                className={`w-full px-3 py-2 text-sm rounded-xl border bg-teal-50/50 focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all font-semibold text-stone-800 ${!form.total_rooms || parseInt(form.total_rooms) < 1 ? 'border-red-300' : 'border-teal-200'}`} />
              {form.total_rooms && parseInt(form.total_rooms) > 0 && (
                <p className="text-[10px] text-teal-600 mt-1 font-medium">✓ {roomDrafts.length} room{roomDrafts.length !== 1 ? 's' : ''} ready to configure on next step</p>
              )}
            </div>
          )}
        </div>

        {/* Amenities */}
        <div>
          <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-2">Property Amenities</label>
          <div className="flex flex-wrap gap-2">
            {AMENITY_OPTIONS.map(a => {
              var active = form.amenities.includes(a)
              return (
                <button key={a} type="button" onClick={() => toggleAmenity(a)}
                  className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ${active ? 'bg-teal-50 text-teal-700 border-teal-300' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
                  {a}
                </button>
              )
            })}
          </div>
        </div>

        {/* Map */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
              Pin Location <span className="text-stone-300 normal-case font-normal">(optional)</span>
            </label>
            {form.latitude && form.longitude && (
              <span className="flex items-center gap-1 text-[10px] text-teal-600 font-medium">
                <MapPin size={10} /> {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                <button type="button" onClick={() => setForm(f => ({ ...f, latitude: null, longitude: null }))} className="ml-1 text-stone-400 hover:text-red-500">✕</button>
              </span>
            )}
          </div>
          <div className="rounded-2xl overflow-hidden border border-stone-200">
            <PropertyMap mode="pick" lat={form.latitude} lng={form.longitude} properties={otherProperties} onPick={handlePickLocation} height="350px" />
          </div>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Room Setup (full width, scrollable)
  // ─────────────────────────────────────────────────────────────────────────
  function renderStep1() {
    if (roomDrafts.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BedDouble size={56} className="text-stone-200 mb-4" />
          <p className="font-semibold text-stone-500 text-lg">No rooms to configure</p>
          <p className="text-sm text-stone-400 mt-1 max-w-sm">Go back and enter the Total Rooms count to generate room slots.</p>
          <button type="button" onClick={() => setStep(0)} className="mt-4 px-5 py-2 rounded-xl bg-stone-100 text-stone-600 text-sm font-medium hover:bg-stone-200 transition-colors flex items-center gap-2">
            <ChevronLeft size={15} /> Back to Property Info
          </button>
        </div>
      )
    }

    return (
      <div className="space-y-5">
        <div className="p-3.5 rounded-xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-900/50 text-xs text-teal-800 dark:text-teal-200 flex items-start gap-2">
          <BedDouble size={16} className="flex-shrink-0 mt-0.5" />
          <span>You have <strong>{roomDrafts.length} room{roomDrafts.length !== 1 ? 's' : ''}</strong> to configure. Fill in the details for each room below. All required fields must be completed before submitting.</span>
        </div>

        {roomDrafts.map((draft, idx) => (
          <Card key={draft.id} className="p-0 overflow-hidden shadow-sm border border-teal-100 dark:border-teal-900/30">
            {/* Card Header */}
            <div className="px-5 py-3 border-b border-stone-100 dark:border-white/10 bg-teal-50/60 dark:bg-teal-950/20 flex items-center gap-3">
              <div className="w-7 h-7 rounded-full bg-teal-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">{idx + 1}</div>
              <h3 className="font-bold text-teal-800 dark:text-teal-300 text-sm">Room {idx + 1} Details</h3>
            </div>

            <div className="p-5 space-y-5">
              {/* Photos */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Room Photos <span className="text-stone-300 normal-case">(optional)</span></label>
                <div className="flex flex-wrap gap-2">
                  {(draft.imagePreviews || []).map((url, iIdx) => (
                    <div key={iIdx} className="relative w-20 h-20 rounded-lg overflow-hidden group border border-stone-200">
                      <img src={url} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => removeRoomDraftImage(idx, iIdx)}
                        className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                        <X size={10} />
                      </button>
                    </div>
                  ))}
                  <label className="w-20 h-20 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 hover:border-teal-300 hover:bg-teal-50 cursor-pointer flex flex-col items-center justify-center transition-all text-stone-300">
                    <ImagePlus size={18} />
                    <span className="text-[8px] mt-0.5 text-stone-400">Add</span>
                    <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={e => handleRoomDraftImages(idx, e.target.files)} />
                  </label>
                </div>
              </div>

              {/* Fields Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Room # *</label>
                  <Input value={draft.room_number} onChange={e => updateRoomDraft(idx, 'room_number', e.target.value)} placeholder="101" className="bg-stone-50 focus:bg-white" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Floor</label>
                  <Input type="number" min="1" value={draft.floor} onChange={e => updateRoomDraft(idx, 'floor', e.target.value)} placeholder="1" className="bg-stone-50 focus:bg-white" />
                </div>
                {form.accepts_long_term && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Monthly (₱) *</label>
                    <Input type="number" min="0" value={draft.price_monthly} onChange={e => updateRoomDraft(idx, 'price_monthly', e.target.value)} placeholder="3500" className="bg-stone-50 focus:bg-white" />
                  </div>
                )}
                {form.accepts_transient && (
                  <div>
                    <label className="text-[10px] uppercase tracking-wider text-teal-600 font-medium block mb-1.5">Daily (₱) *</label>
                    <Input type="number" min="0" value={draft.price_daily} onChange={e => updateRoomDraft(idx, 'price_daily', e.target.value)} placeholder="500" className="bg-teal-50/50 focus:bg-white border-teal-200" />
                  </div>
                )}
              </div>

              {/* Room Amenities */}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Room Amenities</label>
                <div className="flex flex-wrap gap-1.5">
                  {['WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry'].map(a => (
                    <button key={a} type="button" onClick={() => toggleRoomDraftAmenity(idx, a)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${draft.amenities.includes(a) ? 'bg-teal-50 text-teal-700 border-teal-300' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300'}`}>
                      {a}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Review & Submit
  // ─────────────────────────────────────────────────────────────────────────
  function renderStep2() {
    return (
      <div className="space-y-6">
        <div className="p-4 rounded-2xl bg-teal-50 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800 space-y-3">
          <h3 className="font-bold text-teal-800 dark:text-teal-300 text-sm flex items-center gap-2"><CheckCircle2 size={16} /> Ready to Submit</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-white/10">
              <p className="text-stone-400 text-[10px] mb-0.5">Property Name</p>
              <p className="font-semibold text-stone-800 dark:text-stone-200 truncate">{form.name || '—'}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-white/10">
              <p className="text-stone-400 text-[10px] mb-0.5">Location</p>
              <p className="font-semibold text-stone-800 dark:text-stone-200">{form.barangay}, {form.municipality}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-white/10">
              <p className="text-stone-400 text-[10px] mb-0.5">Total Rooms</p>
              <p className="font-semibold text-stone-800 dark:text-stone-200">{roomDrafts.length} room{roomDrafts.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-white/10">
              <p className="text-stone-400 text-[10px] mb-0.5">Stay Types</p>
              <p className="font-semibold text-stone-800 dark:text-stone-200">{[form.accepts_long_term && 'Monthly', form.accepts_transient && 'Daily'].filter(Boolean).join(' + ')}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-white/10">
              <p className="text-stone-400 text-[10px] mb-0.5">Permit Files</p>
              <p className="font-semibold text-stone-800 dark:text-stone-200">{(form.permit_urls?.length || 0) + permitFiles.length} file{(form.permit_urls?.length || 0) + permitFiles.length !== 1 ? 's' : ''}</p>
            </div>
            <div className="bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-white/10">
              <p className="text-stone-400 text-[10px] mb-0.5">GPS Pin</p>
              <p className="font-semibold text-stone-800 dark:text-stone-200">{form.latitude ? '✅ Set' : '—'}</p>
            </div>
          </div>
        </div>

        {/* Room Summary */}
        {roomDrafts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">Room Summary</p>
            {roomDrafts.map((r, i) => (
              <div key={r.id} className="flex items-center justify-between bg-white dark:bg-stone-900 rounded-xl p-3 border border-stone-100 dark:border-white/10 text-xs">
                <span className="font-bold text-stone-700 dark:text-stone-300">Room #{r.room_number} · Floor {r.floor || 1}</span>
                <span className="text-stone-500">
                  {r.price_monthly ? `₱${parseFloat(r.price_monthly).toLocaleString()}/mo` : ''}
                  {r.price_monthly && r.price_daily ? ' · ' : ''}
                  {r.price_daily ? `₱${parseFloat(r.price_daily).toLocaleString()}/day` : ''}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
          <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
          <span>Your property will be submitted for <strong>admin review</strong> before going live. This usually takes 1–2 business days.</span>
        </div>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EDIT MODE — Rooms Tab
  // ─────────────────────────────────────────────────────────────────────────
  function renderEditRoomsTab() {
    const totalCount = rooms.length
    const availableCount = rooms.filter(r => r.is_available).length
    const occupiedCount = totalCount - availableCount

    return (
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-stone-100 dark:border-white/10">
          <div>
            <h3 className="font-bold text-stone-900 dark:text-white text-base flex items-center gap-2">
              <BedDouble size={18} className="text-teal-600" />
              Property Rooms
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              {totalCount} room{totalCount !== 1 ? 's' : ''} total · <span className="text-teal-600 font-medium">{availableCount} available</span> · <span className="text-stone-400">{occupiedCount} occupied</span>
            </p>
          </div>

          {!showRoomForm && (
            <button
              type="button"
              onClick={openAddRoom}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm hover:bg-teal-700 transition-colors self-start sm:self-auto"
            >
              <Plus size={14} /> Add Room
            </button>
          )}
        </div>

        {/* Room Form (Add or Edit) */}
        {showRoomForm && (
          <div className="p-5 rounded-2xl bg-teal-50/40 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/50 space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-sm text-stone-900 dark:text-white flex items-center gap-2">
                {editingRoom ? <Edit2 size={15} className="text-teal-600" /> : <Plus size={15} className="text-teal-600" />}
                {editingRoom ? `Edit Room ${roomForm.room_number || ''}` : 'Add New Room'}
              </h4>
              <button
                type="button"
                onClick={closeRoomForm}
                className="p-1 rounded-lg text-stone-400 hover:text-stone-600 hover:bg-stone-200/50 transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Photos */}
            <RoomImagesUploader
              existingUrls={roomExistingUrls}
              setExistingUrls={setRoomExistingUrls}
              newFiles={roomNewFiles}
              setNewFiles={setRoomNewFiles}
            />

            {/* Fields grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1">
                  Room # *
                </label>
                <Input
                  value={roomForm.room_number}
                  onChange={e => setRoomField('room_number', e.target.value)}
                  placeholder="e.g. 101"
                  className="bg-white dark:bg-stone-800"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1">
                  Floor
                </label>
                <Input
                  type="number"
                  min="1"
                  value={roomForm.floor}
                  onChange={e => setRoomField('floor', parseInt(e.target.value) || 1)}
                  placeholder="1"
                  className="bg-white dark:bg-stone-800"
                />
              </div>

              {form.accepts_long_term && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1">
                    Monthly (₱) *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={roomForm.price_monthly}
                    onChange={e => setRoomField('price_monthly', e.target.value)}
                    placeholder="3500"
                    className="bg-white dark:bg-stone-800"
                  />
                </div>
              )}

              {form.accepts_transient && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-teal-600 font-medium block mb-1">
                    Daily (₱) *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={roomForm.price_daily}
                    onChange={e => setRoomField('price_daily', e.target.value)}
                    placeholder="500"
                    className="bg-white dark:bg-stone-800 border-teal-200"
                  />
                </div>
              )}
            </div>

            {/* Availability Toggle */}
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-medium text-stone-600 dark:text-stone-300">Room Status:</span>
              <button
                type="button"
                onClick={() => setRoomField('is_available', !roomForm.is_available)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold flex items-center gap-1.5 transition-all ${
                  roomForm.is_available
                    ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-300'
                    : 'bg-rose-100 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-300'
                }`}
              >
                <CheckCircle size={13} />
                {roomForm.is_available ? 'Available' : 'Occupied'}
              </button>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">
                Room Amenities
              </label>
              <div className="flex flex-wrap gap-1.5">
                {ROOM_AMENITY_OPTIONS.map(a => {
                  const active = (roomForm.amenities || []).includes(a)
                  return (
                    <button
                      key={a}
                      type="button"
                      onClick={() => toggleRoomAmenity(a)}
                      className={`px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                        active
                          ? 'bg-teal-50 text-teal-700 border-teal-300 dark:bg-teal-900/40 dark:text-teal-200'
                          : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 dark:bg-stone-800 dark:text-stone-400'
                      }`}
                    >
                      {a}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1">
                Notes (optional)
              </label>
              <textarea
                rows={2}
                value={roomForm.notes}
                onChange={e => setRoomField('notes', e.target.value)}
                placeholder="e.g. Near the balcony, includes wardrobe..."
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 resize-none"
              />
            </div>

            {/* Form Action Buttons */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveRoom}
                disabled={roomUploading}
                className="px-5 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
              >
                {roomUploading && <Loader2 size={13} className="animate-spin" />}
                {roomUploading ? 'Saving...' : editingRoom ? 'Update Room' : 'Add Room'}
              </button>
              <button
                type="button"
                onClick={closeRoomForm}
                className="px-4 py-2 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 text-xs font-medium hover:bg-stone-50 dark:hover:bg-stone-700 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Room List */}
        {roomsLoading ? (
          <div className="py-12 flex flex-col items-center justify-center text-center">
            <Loader2 size={28} className="animate-spin text-teal-600 mb-2" />
            <p className="text-xs text-stone-400">Loading rooms...</p>
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-stone-200 dark:border-stone-800 rounded-2xl p-6">
            <BedDouble size={40} className="text-stone-300 dark:text-stone-600 mb-3" />
            <p className="font-bold text-sm text-stone-700 dark:text-stone-300">No rooms listed yet</p>
            <p className="text-xs text-stone-400 max-w-sm mt-1 mb-4">
              Add individual rooms to let tenants view specific options, pricing, and availability.
            </p>
            <button
              type="button"
              onClick={openAddRoom}
              className="px-4 py-2 rounded-xl bg-teal-600 text-white text-xs font-bold shadow-sm hover:bg-teal-700 transition-colors flex items-center gap-1.5"
            >
              <Plus size={14} /> Add First Room
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {rooms.map(room => {
              const hasPhotos = room.image_urls && room.image_urls.length > 0
              const isActioning = roomActioning === room.id
              return (
                <div
                  key={room.id}
                  className="bg-white dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-white/10 p-4 flex flex-col justify-between hover:border-teal-300 dark:hover:border-teal-700/60 transition-all shadow-sm group"
                >
                  <div className="flex gap-3 items-start">
                    {/* Photo thumbnail */}
                    <div
                      className="w-16 h-16 rounded-xl bg-stone-100 dark:bg-stone-700 overflow-hidden flex-shrink-0 relative group/thumb cursor-pointer border border-stone-200 dark:border-white/5"
                      onClick={() => hasPhotos && setViewingImage(room.image_urls[0])}
                    >
                      {hasPhotos ? (
                        <>
                          <img src={room.image_urls[0]} alt="" className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/thumb:opacity-100 flex items-center justify-center transition-opacity text-white text-[10px]">
                            <Eye size={14} />
                          </div>
                        </>
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-stone-300 dark:text-stone-500">
                          <BedDouble size={20} />
                          <span className="text-[8px] mt-0.5 font-medium">No photo</span>
                        </div>
                      )}
                    </div>

                    {/* Room Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <h5 className="font-black text-sm text-stone-900 dark:text-white truncate">
                          Room #{room.room_number}
                        </h5>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          room.is_available
                            ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                            : 'bg-stone-100 text-stone-500 dark:bg-stone-700 dark:text-stone-400'
                        }`}>
                          {room.is_available ? 'Available' : 'Occupied'}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-400 mt-0.5">Floor {room.floor || 1}</p>

                      {/* Pricing */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs font-bold text-teal-700 dark:text-teal-400">
                        {room.price_monthly ? <span>{formatCurrency(room.price_monthly)}<span className="text-[10px] font-normal text-stone-400">/mo</span></span> : null}
                        {room.price_monthly && room.price_daily ? <span className="text-stone-300">·</span> : null}
                        {room.price_daily ? <span>{formatCurrency(room.price_daily)}<span className="text-[10px] font-normal text-stone-400">/day</span></span> : null}
                      </div>

                      {/* Amenities pills */}
                      {room.amenities && room.amenities.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.amenities.slice(0, 3).map(a => (
                            <span key={a} className="text-[9px] px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-700/60 text-stone-500 dark:text-stone-300">
                              {a}
                            </span>
                          ))}
                          {room.amenities.length > 3 && (
                            <span className="text-[9px] px-1 py-0.5 text-stone-400">
                              +{room.amenities.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="flex items-center justify-between pt-3 mt-3 border-t border-stone-100 dark:border-white/5">
                    <button
                      type="button"
                      disabled={isActioning}
                      onClick={() => handleToggleRoomAvailability(room)}
                      className="text-[11px] text-stone-500 hover:text-teal-600 dark:hover:text-teal-400 font-medium transition-colors"
                    >
                      {room.is_available ? 'Mark Occupied' : 'Mark Available'}
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditRoom(room)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-teal-600 hover:bg-teal-50 dark:hover:bg-teal-950/40 transition-colors"
                        title="Edit Room"
                      >
                        <Edit2 size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={isActioning}
                        onClick={() => handleDeleteRoom(room.id)}
                        className="p-1.5 rounded-lg text-stone-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                        title="Delete Room"
                      >
                        {isActioning ? <Loader2 size={13} className="animate-spin text-red-500" /> : <Trash2 size={13} />}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  const maxStep = isEdit ? 0 : 2

  return (
    <div className="page-enter min-h-screen" style={{ background: 'var(--bg-main)' }}>
      <Topbar title={isEdit ? 'Edit Property' : 'Add New Property'} />

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Step Indicator / Edit Tabs */}
        {isEdit ? (
          <div className="flex border-b border-stone-200 dark:border-white/10 mb-6 gap-2">
            <button
              type="button"
              onClick={() => { setActiveTab('details'); setError('') }}
              className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'details'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <Home size={16} /> Property Details
            </button>
            <button
              type="button"
              onClick={() => { setActiveTab('rooms'); setError('') }}
              className={`pb-3 px-4 font-bold text-sm flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'rooms'
                  ? 'border-teal-600 text-teal-600 dark:text-teal-400 dark:border-teal-400'
                  : 'border-transparent text-stone-500 hover:text-stone-800 dark:hover:text-stone-300'
              }`}
            >
              <BedDouble size={16} /> Rooms
              <span className="px-2 py-0.5 rounded-full text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 font-semibold">
                {rooms.length}
              </span>
            </button>
          </div>
        ) : (
          <StepIndicator step={step} isEdit={isEdit} />
        )}

        {/* Step / Section Label */}
        <div className="mb-6">
          <h2 className="text-xl font-black text-stone-900 dark:text-white flex items-center gap-2">
            {isEdit ? (
              activeTab === 'details' ? (
                <><Home size={20} className="text-teal-600" /> Edit Property Details</>
              ) : (
                <><BedDouble size={20} className="text-teal-600" /> Manage Rooms</>
              )
            ) : (
              <>
                {step === 0 && <><Home size={20} className="text-teal-600" /> Property Details</>}
                {step === 1 && <><BedDouble size={20} className="text-teal-600" /> Room Setup</>}
                {step === 2 && <><CheckCircle2 size={20} className="text-teal-600" /> Review & Submit</>}
              </>
            )}
          </h2>
          <p className="text-[12px] text-stone-500 mt-1">
            {isEdit ? (
              activeTab === 'details'
                ? 'Update your property information, permits, and location pin.'
                : 'Add, edit, or adjust pricing and availability for individual rooms in this property.'
            ) : (
              <>
                {step === 0 && 'Fill in your property information. All required fields (*) must be completed before proceeding.'}
                {step === 1 && `Configure each room for your property. You have ${roomDrafts.length} room${roomDrafts.length !== 1 ? 's' : ''} to set up.`}
                {step === 2 && 'Review your property and room details before submitting for admin approval.'}
              </>
            )}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 text-[13px] text-red-700 dark:text-red-300 flex items-start gap-2">
            <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Content */}
        <div className="bg-white dark:bg-stone-900 rounded-3xl shadow-sm border border-stone-200 dark:border-white/10 p-6 sm:p-8">
          {isEdit ? (
            activeTab === 'details' ? renderStep0() : renderEditRoomsTab()
          ) : (
            <>
              {step === 0 && renderStep0()}
              {step === 1 && renderStep1()}
              {step === 2 && renderStep2()}
            </>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="flex items-center justify-between mt-6 gap-3">
          {isEdit ? (
            activeTab === 'details' ? (
              <>
                <button type="button" onClick={() => navigate('/owner/properties')}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handleSubmit} disabled={isLoading || uploading}
                  className="flex-1 max-w-xs px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold shadow-sm disabled:opacity-50 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                  {(isLoading || uploading) && <Loader2 size={15} className="animate-spin" />}
                  {uploading ? 'Uploading…' : isLoading ? 'Saving…' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button type="button" onClick={() => setActiveTab('details')}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2">
                  <ChevronLeft size={15} /> Back to Details
                </button>
                <button type="button" onClick={() => navigate('/owner/properties')}
                  className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold shadow-sm hover:bg-teal-700 transition-colors">
                  Done Editing
                </button>
              </>
            )
          ) : (
            <>
              {/* Left: Cancel / Back */}
              {step === 0 ? (
                <button type="button" onClick={() => navigate('/owner/properties')}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors">
                  Cancel
                </button>
              ) : (
                <button type="button" onClick={() => { setError(''); setStep(s => s - 1) }}
                  className="px-5 py-2.5 rounded-xl border border-stone-200 dark:border-white/10 bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-400 text-sm font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2">
                  <ChevronLeft size={15} /> Back
                </button>
              )}

              {/* Right: Next / Submit */}
              {step < maxStep ? (
                <button type="button"
                  onClick={() => {
                    if (step === 0) goToStep1()
                    else if (step === 1) goToStep2()
                  }}
                  className="flex-1 max-w-xs px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold shadow-sm hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                  Continue <ChevronRight size={15} />
                </button>
              ) : (
                <button type="button" onClick={handleSubmit} disabled={isLoading || uploading}
                  className="flex-1 max-w-xs px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-bold shadow-sm disabled:opacity-50 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                  {(isLoading || uploading) && <Loader2 size={15} className="animate-spin" />}
                  {uploading ? 'Uploading…' : isLoading ? 'Saving…' : '🚀 Submit Property'}
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Permit Preview Modal */}
      {permitPreviewModal && activePermitPreview && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={() => setPermitPreviewModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-stone-100">
              <h3 className="font-bold text-sm text-stone-800">Permit Preview</h3>
              <button className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg" onClick={() => setPermitPreviewModal(false)}><X size={16} /></button>
            </div>
            <div className="overflow-auto p-4 flex-1 bg-stone-50 flex items-center justify-center">
              {activePermitPreview.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(activePermitPreview)} alt="Permit Preview" className="max-w-full max-h-[75vh] object-contain rounded-lg" />
              ) : (
                <iframe src={URL.createObjectURL(activePermitPreview)} className="w-[80vw] h-[75vh] max-w-4xl rounded-lg" title="PDF Preview" />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}

      <ImageViewerModal isOpen={!!viewingImage} imageUrl={viewingImage} onClose={() => setViewingImage(null)} />
    </div>
  )
}
