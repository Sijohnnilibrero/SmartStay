import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Badge, Button, Input } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Plus, Trash2, Edit2, MapPin, ImagePlus, X, Upload, Loader2, BedDouble, CheckCircle } from 'lucide-react'
import { formatCurrency } from '@/lib/utils'
import { supabase } from '@/lib/supabase'
import NotificationBell from '@/components/layout/NotificationBell'

const AMENITY_OPTIONS = ['WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry', 'Garden']
const EMPTY_FORM = { room_number: '', floor: 1, price_monthly: '', price_daily: '', amenities: [], notes: '', is_available: true, image_urls: [] }

// ── Multi-Image Uploader ─────────────────────────────────────────
function RoomImagesUploader({ existingUrls, setExistingUrls, newFiles, setNewFiles }) {
  const inputRef = useRef(null)
  const [drag, setDrag] = useState(false)

  const addToast = useAppStore((s) => s.addToast)

  function handleFiles(files) {
    if (!files || files.length === 0) return
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 5 * 1024 * 1024)
    if (validFiles.length < files.length) addToast('Some files were ignored. Must be images under 5MB.', 'error')
    setNewFiles(prev => [...prev, ...validFiles])
  }

  function removeExisting(index) {
    setExistingUrls(prev => prev.filter((_, i) => i !== index))
  }

  function removeNewFile(index) {
    setNewFiles(prev => prev.filter((_, i) => i !== index))
  }

  return (
    <div>
      <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">
        Room Photos <span className="text-stone-300 normal-case font-normal">(optional, upload multiple)</span>
      </label>
      <div className="flex flex-wrap gap-3 mb-2">
        {existingUrls.map((url, idx) => (
          <div key={`url-${idx}`} className="relative rounded-lg overflow-hidden group w-24 h-24 bg-stone-100 flex-shrink-0">
            <img src={url} alt={`Photo ${idx}`} className="w-full h-full object-cover" />
            <button type="button" onClick={() => removeExisting(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={12} />
            </button>
          </div>
        ))}
        {newFiles.map((file, idx) => (
          <div key={`file-${idx}`} className="relative rounded-lg overflow-hidden group w-24 h-24 bg-stone-100 border-2 border-teal-200 flex-shrink-0">
            <img src={URL.createObjectURL(file)} alt={`New ${idx}`} className="w-full h-full object-cover" />
            <div className="absolute top-1 left-1 bg-[--teal] text-white text-[9px] px-1 rounded">NEW</div>
            <button type="button" onClick={() => removeNewFile(idx)}
              className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
              <X size={12} />
            </button>
          </div>
        ))}
        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true) }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); handleFiles(e.dataTransfer.files) }}
          onClick={() => inputRef.current?.click()}
          className={
            'w-24 h-24 flex-shrink-0 rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center gap-1 transition-all ' +
            (drag ? 'border-[--teal] bg-[--teal-light]' : 'border-stone-200 bg-stone-50 hover:border-teal-300 hover:bg-[#F0FAF5]')
          }
        >
          <ImagePlus size={16} className="text-stone-300" />
          <p className="text-[9px] text-stone-400">Add Photos</p>
        </div>
      </div>
      <input ref={inputRef} type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp"
        className="hidden" onChange={(e) => handleFiles(e.target.files)} />
    </div>
  )
}

export default function HomeownerRooms() {
  const params = useParams()
  const propertyId = params.propertyId
  const navigate = useNavigate()

  const fetchRooms       = useAuthStore((s) => s.fetchRooms)
  const createRoom       = useAuthStore((s) => s.createRoom)
  const updateRoom       = useAuthStore((s) => s.updateRoom)
  const deleteRoom       = useAuthStore((s) => s.deleteRoom)
  const fetchProperty    = useAuthStore((s) => s.fetchProperty)
  const uploadRoomImages = useAuthStore((s) => s.uploadRoomImages)
  const fetchReservations = useAuthStore((s) => s.fetchReservations)
  const user             = useAuthStore((s) => s.user)
  const addToast = useAppStore((s) => s.addToast)
  const systemConfirm = useAppStore((s) => s.systemConfirm)

  const [rooms,    setRooms]    = useState([])
  const [property, setProperty] = useState(null)
  const [reservations, setReservations] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [editing,  setEditing]  = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [actioning,setActioning]= useState(null)
  const [uploading,setUploading]= useState(false)
  const [form,     setForm]     = useState(EMPTY_FORM)
  const [newFiles,     setNewFiles]     = useState([])
  const [existingUrls, setExistingUrls] = useState([])
  const wasHiddenRef = useRef(false)

  const loadData = useCallback(function(silent = false) {
    if (!silent) setLoading(true)
    Promise.all([fetchRooms(propertyId), fetchProperty(propertyId), fetchReservations()])
      .then(([r, p, res]) => { 
        setRooms(r || []); 
        setProperty(p); 
        setReservations(res || []);
        if (!silent) setLoading(false) 
      })
      .catch(() => { if (!silent) setLoading(false) })
  }, [propertyId, fetchRooms, fetchProperty, fetchReservations])

  useEffect(() => { loadData() }, [loadData])

  useEffect(() => {
    if (!user) return
    const channel = supabase.channel('homeowner-rooms-changes')
    channel.on('postgres_changes', { event: '*', schema: 'public', table: 'reservations' }, () => {
      loadData(true)
    }).on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
      loadData(true)
    }).subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [user, loadData])

  useEffect(() => {
    if (window.location.hash === '#add') {
      openAddForm()
      window.history.replaceState(null, '', window.location.pathname)
    }
  }, [])

  useEffect(() => {
    function onVisibility() {
      if (document.hidden) wasHiddenRef.current = true
      else if (wasHiddenRef.current) { wasHiddenRef.current = false; loadData(true) }
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => document.removeEventListener('visibilitychange', onVisibility)
  }, [loadData])

  function openAddForm() {
    setEditing(null)
    setForm(EMPTY_FORM)
    setNewFiles([])
    setExistingUrls([])
    setShowForm(true)
  }

  function openEditForm(room) {
    setEditing(room.id)
    setForm({
      room_number: room.room_number,
      floor: room.floor,
      price_monthly: room.price_monthly,
      price_daily: room.price_daily || '',
      amenities: room.amenities || [],
      notes: room.notes || '',
      is_available: room.is_available,
      image_urls: room.image_urls || []
    })
    setExistingUrls(room.image_urls || [])
    setNewFiles([])
    setShowForm(true)
  }

  function closeForm() { setShowForm(false); setEditing(null); setNewFiles([]); setExistingUrls([]) }

  function setField(key, val) { setForm((f) => ({ ...f, [key]: val })) }
  function toggleAmenity(a) {
    setForm((f) => ({
      ...f,
      amenities: f.amenities.includes(a) ? f.amenities.filter((x) => x !== a) : [...f.amenities, a],
    }))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    let finalUrls = [...existingUrls]

    if (newFiles.length > 0) {
      setUploading(true)
      try { 
        const uploadedUrls = await uploadRoomImages(newFiles, editing || 'new') 
        finalUrls = [...finalUrls, ...uploadedUrls]
      }
      catch (err) { addToast('Upload failed: ' + (err.message || err), 'error'); setUploading(false); return }
      setUploading(false)
    }

    const payload = {
      room_number: form.room_number,
      floor: parseInt(form.floor) || 1,
      price_monthly: parseFloat(form.price_monthly) || 0,
      price_daily: parseFloat(form.price_daily) || null,
      amenities: form.amenities,
      notes: form.notes,
      is_available: form.is_available,
      image_urls: finalUrls,
    }

    try {
      if (editing) {
        await updateRoom(editing, payload)
      } else {
        await createRoom({ ...payload, property_id: propertyId })
      }
      closeForm()
      loadData()
      addToast(editing ? 'Room updated successfully!' : 'Room created successfully!', 'success')
    } catch (err) {
      addToast(err.message || err.details || 'Failed to save room.', 'error')
    }
  }

  async function handleDelete(id) {
    if (!(await systemConfirm('Are you sure you want to delete this room?'))) return
    setActioning(id)
    try { await deleteRoom(id); loadData(); addToast('Room deleted successfully!', 'success') }
    catch (err) { addToast(err.message || 'Failed to delete room.', 'error') }
    finally { setActioning(null) }
  }

  const totalRooms     = rooms.length
  const availableRooms = rooms.filter((r) => r.is_available).length

  function getRoomDisplayStatus(room) {
    if (room.is_available) return { label: 'Available', variant: 'teal' }
    
    // If it's not available, check if it's waiting for payment
    const roomReservations = reservations.filter(r => r.room_id === room.id)
    const isAwaiting = roomReservations.some(r => r.status === 'awaiting_payment')
    
    if (isAwaiting) return { label: 'Awaiting Payment', variant: 'amber' }
    return { label: 'Occupied', variant: 'coral' }
  }

  return (
    <div className="page-enter p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-lg md:text-xl text-stone-800">Manage Rooms</h1>
          {property && (
            <p className="text-[12px] text-stone-400 flex items-center gap-1 mt-0.5">
              <MapPin size={11} className="text-[--teal]" /> {property.name} · {property.address}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <Button variant="ghost" size="sm" onClick={() => navigate('/owner/properties')}>
            ← Back to Properties
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {[
          { label: 'Total Rooms', value: totalRooms,              accent: '#0F6E56', bg: '#E1F5EE' },
          { label: 'Available',   value: availableRooms,          accent: '#1D9E75', bg: '#D1FAE5' },
          { label: 'Occupied/Reserved', value: totalRooms - availableRooms, accent: '#D85A30', bg: '#FAECE7' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-stone-200 p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: s.bg, color: s.accent }}>
              <BedDouble size={18} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-stone-400">{s.label}</p>
              <p className="font-bold text-xl" style={{ color: s.accent }}>{s.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Add Room button */}
      {!showForm && (
        <Button variant="primary" size="sm" onClick={openAddForm}>
          <Plus size={13} /> Add Room
        </Button>
      )}

      {/* Room Form */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
            <h3 className="font-semibold text-stone-800">{editing ? 'Edit Room' : 'Add New Room'}</h3>
            <button onClick={closeForm} className="text-stone-400 hover:text-stone-600 transition-colors">
              <X size={16} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Photo */}
            <RoomImagesUploader
              existingUrls={existingUrls}
              setExistingUrls={setExistingUrls}
              newFiles={newFiles}
              setNewFiles={setNewFiles}
            />

            {/* Fields grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Room #</label>
                <Input value={form.room_number}
                  onChange={(e) => setField('room_number', e.target.value)}
                  placeholder="101" required />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Floor</label>
                <Input type="number" value={form.floor}
                  onChange={(e) => setField('floor', parseInt(e.target.value) || 1)}
                  placeholder="1" />
              </div>
              {property?.accepts_long_term && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Price (₱/mo)</label>
                  <Input type="number" value={form.price_monthly}
                    onChange={(e) => setField('price_monthly', e.target.value)}
                    placeholder="3500" required />
                </div>
              )}
              {property?.accepts_transient && (
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5 text-teal-600">Daily Price (₱/day)</label>
                  <Input type="number" value={form.price_daily}
                    onChange={(e) => setField('price_daily', e.target.value)}
                    placeholder="500" required className="border-teal-200 focus:ring-teal-400/30" />
                </div>
              )}
              <div>
                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Status</label>
                <button
                  type="button"
                  onClick={() => setField('is_available', !form.is_available)}
                  className={
                    'w-full py-2 rounded-lg text-[12px] font-semibold border transition-all flex items-center justify-center gap-1.5 ' +
                    (form.is_available
                      ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-200'
                      : 'bg-[#FAECE7] text-[#D85A30] border-red-200')
                  }
                >
                  <CheckCircle size={13} />
                  {form.is_available ? 'Available' : 'Occupied'}
                </button>
              </div>
            </div>

            {/* Amenities */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Amenities</label>
              <div className="flex flex-wrap gap-1.5">
                {AMENITY_OPTIONS.map((a) => (
                  <button key={a} type="button" onClick={() => toggleAmenity(a)}
                    className={
                      'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ' +
                      (form.amenities.includes(a)
                        ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-300'
                        : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300')
                    }>{a}</button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Notes</label>
              <textarea value={form.notes}
                onChange={(e) => setField('notes', e.target.value)}
                rows={2} placeholder="Any special notes about this room..."
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 resize-none" />
            </div>

            {/* Actions */}
            <div className="flex justify-start gap-3 pt-2">
              <button type="submit" disabled={uploading}
                className="py-2 px-6 rounded-xl bg-[--teal] text-white text-sm font-semibold hover:bg-teal-700 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {uploading && <Loader2 size={14} className="animate-spin" />}
                {uploading ? 'Uploading photo…' : editing ? 'Save Changes' : 'Add Room'}
              </button>
              <Button type="button" variant="ghost" size="sm" onClick={closeForm}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {/* Room Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="bg-white rounded-2xl border border-stone-200 overflow-hidden">
              <div className="h-36 shimmer" />
              <div className="p-4 space-y-2">
                <div className="h-4 shimmer rounded w-1/2" />
                <div className="h-3 shimmer rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="text-center py-16 text-stone-400 bg-white rounded-2xl border border-stone-200">
          <div className="w-14 h-14 bg-stone-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <BedDouble size={24} className="text-stone-300" />
          </div>
          <p className="font-semibold text-stone-600">No rooms added yet</p>
          <p className="text-sm mt-1">Add individual rooms with their own pricing, photos, and amenities.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl border border-stone-200 overflow-hidden hover:shadow-md transition-all group">
              {/* Room image or placeholder */}
              <div className="relative aspect-square overflow-hidden">
                {r.image_urls && r.image_urls.length > 0 ? (
                  <>
                    <img src={r.image_urls[0]} alt={`Room ${r.room_number}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    {r.image_urls.length > 1 && (
                      <div className="absolute bottom-2 right-2 bg-black/60 text-white text-[10px] px-2 py-1 rounded-full backdrop-blur-sm flex items-center gap-1 z-10">
                        <ImagePlus size={10} /> {r.image_urls.length} photos
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-stone-100 to-stone-50 flex items-center justify-center">
                    <BedDouble size={36} className="text-stone-200" />
                  </div>
                )}
                {/* Overlay badges */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                <div className="absolute top-3 left-3">
                  <span className="bg-white/90 backdrop-blur-sm text-stone-700 font-bold text-[12px] px-2.5 py-1 rounded-full shadow-sm">
                    Room {r.room_number}
                  </span>
                </div>
                <div className="absolute top-3 right-3">
                  <Badge variant={getRoomDisplayStatus(r).variant}>
                    {getRoomDisplayStatus(r).label}
                  </Badge>
                </div>
                <div className="absolute bottom-3 right-3 flex flex-col gap-1 items-end">
                  {property?.accepts_long_term && r.price_monthly > 0 && (
                    <span className="bg-white/95 backdrop-blur-sm text-[--teal] font-bold text-[13px] px-2.5 py-1 rounded-full shadow-sm">
                      {formatCurrency(r.price_monthly)}<span className="text-[10px] font-normal text-stone-500">/mo</span>
                    </span>
                  )}
                  {property?.accepts_transient && r.price_daily > 0 && (
                    <span className="bg-white/95 backdrop-blur-sm text-teal-600 font-bold text-[13px] px-2.5 py-1 rounded-full shadow-sm">
                      {formatCurrency(r.price_daily)}<span className="text-[10px] font-normal text-stone-500">/day</span>
                    </span>
                  )}
                </div>
                <div className="absolute bottom-3 left-3">
                  <span className="bg-black/40 backdrop-blur-sm text-white text-[10px] font-medium px-2 py-0.5 rounded-full">
                    Floor {r.floor}
                  </span>
                </div>
              </div>

              {/* Card body */}
              <div className="p-4">
                {r.amenities && r.amenities.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {r.amenities.map((a) => (
                      <span key={a} className="text-[10px] px-2 py-0.5 bg-stone-50 text-stone-500 rounded-full border border-stone-100">{a}</span>
                    ))}
                  </div>
                )}
                {r.notes && <p className="text-[11px] text-stone-400 italic mb-2">"{r.notes}"</p>}
                <div className="flex gap-2 pt-2 border-t border-stone-100">
                  <button
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] text-stone-500 hover:text-stone-800 hover:bg-stone-100 py-1.5 rounded-lg transition-colors"
                    onClick={() => openEditForm(r)}
                  >
                    <Edit2 size={12} /> Edit
                  </button>
                  <button
                    className="flex-1 flex items-center justify-center gap-1 text-[11px] text-red-400 hover:text-red-600 hover:bg-red-50 py-1.5 rounded-lg transition-colors"
                    onClick={() => handleDelete(r.id)}
                    disabled={actioning === r.id}
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
