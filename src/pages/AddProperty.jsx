import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate, useParams } from 'react-router-dom'
import Topbar from '@/components/layout/Topbar'
import { Button, Card, CardHeader, CardTitle, Input, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import PropertyMap from '@/components/map/PropertyMap'
import { MapPin, ImagePlus, X, Upload, Loader2, Plus, BedDouble, Trash2, Home, CheckCircle2 } from 'lucide-react'
import ImageViewerModal from '@/components/ui/ImageViewerModal'

const MUNICIPALITIES = ['Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Sabtang', 'Itbayat']
const AMENITY_OPTIONS = ['WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry', 'Garden']

const PLACEHOLDER_IMAGES = [
  '/images/property_1.png',
  '/images/property_2.png',
  '/images/property_3.png',
]

var EMPTY_FORM = {
  name: '', description: '', address: '', municipality: 'Basco', island: 'Batan',
  house_number: '', street: '', barangay: '', landmark: '',
  total_rooms: '', amenities: [],
  latitude: null, longitude: null, image_url: null, permit_urls: [], permit_expires_on: '',
  accepts_long_term: true, accepts_transient: false, status: 'pending_review'
}

export default function AddProperty() {
  var navigate = useNavigate()
  var params = useParams()
  var propertyId = params.id
  var isEdit = !!propertyId

  var createProperty = useAuthStore(function(s) { return s.createProperty })
  var updateProperty = useAuthStore(function(s) { return s.updateProperty })
  var fetchProperty  = useAuthStore(function(s) { return s.fetchProperty })
  var uploadPropertyImage = useAuthStore(function(s) { return s.uploadPropertyImage })
  var uploadPropertyPermit = useAuthStore(function(s) { return s.uploadPropertyPermit })
  var createRoom = useAuthStore(function(s) { return s.createRoom })
  var uploadRoomImages = useAuthStore(function(s) { return s.uploadRoomImages })
  var isLoading = useAuthStore(function(s) { return s.isLoading })
  var user = useAuthStore(function(s) { return s.user })
  var addToast = useAppStore(function(s) { return s.addToast })

  var [error, setError] = useState('')
  var [form, setForm] = useState(EMPTY_FORM)
  var [imageFile, setImageFile] = useState(null)
  var [imagePreview, setImagePreview] = useState(null)
  var [permitFiles, setPermitFiles] = useState([])
  var [uploading, setUploading] = useState(false)
  var [dragOver, setDragOver] = useState(false)
  var [permitPreviewModal, setPermitPreviewModal] = useState(false)
  var [activePermitPreview, setActivePermitPreview] = useState(null)
  var [viewingImage, setViewingImage] = useState(null)
  var fileInputRef = useRef(null)

  var [otherProperties, setOtherProperties] = useState([])
  var fetchProperties = useAuthStore(function(s) { return s.fetchProperties })

  // Room Drafts State
  var [roomDrafts, setRoomDrafts] = useState([])

  useEffect(function() {
    fetchProperties({ status: 'active' })
      .then(function(data) {
        setOtherProperties(data.filter(function(p) { return String(p.id) !== String(propertyId) }))
      })
      .catch(function() {})
  }, [fetchProperties, propertyId])

  useEffect(function() {
    if (!isEdit) return
    fetchProperty(propertyId).then(function(p) {
      setForm({
        name: p.name || '',
        description: p.description || '',
        address: p.address || '',
        house_number: p.house_number || '',
        street: p.street || '',
        barangay: p.barangay || '',
        landmark: p.landmark || '',
        municipality: p.municipality || 'Basco',
        island: p.island || 'Batan',
        total_rooms: p.total_rooms != null ? String(p.total_rooms) : '',
        amenities: p.amenities || [],
        latitude: p.latitude || null,
        longitude: p.longitude || null,
        image_url: p.image_url || null,
        permit_urls: p.permit_urls || (p.permit_url ? [p.permit_url] : []),
        permit_expires_on: p.permit_expires_on || '',
        accepts_long_term: p.accepts_long_term !== false,
        accepts_transient: !!p.accepts_transient,
        status: p.status || 'pending_review'
      })
      if (p.image_url) setImagePreview(p.image_url)
    }).catch(function(err) {
      setError('Failed to load property: ' + (err.message || err))
    })
  }, [propertyId, isEdit])

  function set(key, val) {
    setForm(function(f) { var next = Object.assign({}, f); next[key] = val; return next })
  }

  function handleTotalRoomsChange(e) {
    const val = parseInt(e.target.value) || 0
    set('total_rooms', val ? String(val) : '')
    
    // Only auto-generate room drafts if creating a new property
    if (!isEdit) {
      setRoomDrafts(function(prev) {
        if (val > prev.length) {
          return [
            ...prev,
            ...Array(val - prev.length).fill().map((_, i) => ({
              id: Date.now() + i, // temporary unique id
              room_number: `${prev.length + i + 1}`,
              floor: 1,
              price_monthly: '',
              price_daily: '',
              amenities: [],
              notes: '',
              is_available: true,
              imageFiles: [],
              imagePreviews: [],
            }))
          ]
        } else {
          return prev.slice(0, val)
        }
      })
    }
  }

  function toggleAmenity(a) {
    setForm(function(f) {
      var next = Object.assign({}, f)
      next.amenities = f.amenities.indexOf(a) === -1
        ? f.amenities.concat([a])
        : f.amenities.filter(function(x) { return x !== a })
      return next
    })
  }

  async function handlePickLocation(lat, lng) {
    setForm(function(f) { return Object.assign({}, f, { latitude: lat, longitude: lng }) })
    try {
      var res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`)
      var data = await res.json()
      if (data && data.address) {
        setForm(function(f) {
          var next = Object.assign({}, f)
          var st = data.address.road || data.address.pedestrian
          if (st) next.street = st
          var brgy = data.address.village || data.address.suburb || data.address.neighbourhood || data.address.quarter
          if (brgy) next.barangay = brgy
          var muni = data.address.town || data.address.city || data.address.municipality || data.address.county
          if (muni) {
            var m = muni.replace('Municipality of ', '')
            if (MUNICIPALITIES.includes(m)) {
              next.municipality = m
              next.island = (m === 'Sabtang') ? 'Sabtang' : (m === 'Itbayat') ? 'Itbayat' : 'Batan'
            }
          }
          return next
        })
      }
    } catch(err) {
      console.error('Geocoding failed:', err)
    }
  }

  function handleFileSelect(file) {
    if (!file) return
    if (!file.type.startsWith('image/')) { setError('Please select an image file (JPG, PNG, or WEBP).'); return }
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB.'); return }
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
    setError('')
  }

  function handleFileInputChange(e) {
    handleFileSelect(e.target.files[0])
  }

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  function removeImage() {
    setImageFile(null)
    setImagePreview(null)
    set('image_url', null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── Room Draft Helpers ──
  function updateRoomDraft(idx, key, val) {
    setRoomDrafts(function(prev) {
      var next = [...prev]
      next[idx] = { ...next[idx], [key]: val }
      return next
    })
  }

  function toggleRoomDraftAmenity(idx, a) {
    setRoomDrafts(function(prev) {
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
    setRoomDrafts(function(prev) {
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
    setRoomDrafts(function(prev) {
      var next = [...prev]
      next[rIdx] = {
        ...next[rIdx],
        imageFiles: next[rIdx].imageFiles.filter((_, i) => i !== iIdx),
        imagePreviews: next[rIdx].imagePreviews.filter((_, i) => i !== iIdx)
      }
      return next
    })
  }

  // ── Submit Logic ──
  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.street.trim() || !form.barangay.trim()) {
      setError('Please fill in all required property fields (Name, Street, Barangay).')
      return
    }

    if (!isEdit && permitFiles.length === 0 && (!form.permit_urls || form.permit_urls.length === 0)) {
      setError('Please provide a Business Permit.')
      return
    }

    if ((permitFiles.length > 0 || (form.permit_urls && form.permit_urls.length > 0)) && !form.permit_expires_on) {
      setError('Please provide the permit expiration date.')
      return
    }
    
    if (!isEdit) {
      if (!form.accepts_long_term && !form.accepts_transient) {
        setError('Please select who you cater to (Long-term or Transients).')
        return
      }

      if (!form.total_rooms || parseInt(form.total_rooms) < 1) {
        setError('Please enter the number of rooms. At least 1 room is required.')
        return
      }

      if (parseInt(form.total_rooms) > 0 && roomDrafts.length === 0) {
        setError('You entered ' + form.total_rooms + ' room(s) but have not filled in any room details. Please scroll right and fill in the room information.')
        return
      }
      
      for (const r of roomDrafts) {
        if (!r.room_number) {
          setError('Please provide a Room # for all rooms on the right.')
          return
        }
        if (form.accepts_long_term && !form.accepts_transient && (!r.price_monthly || parseFloat(r.price_monthly) <= 0)) {
          setError(`Room #${r.room_number}: Please provide a valid Monthly Price (must be greater than ₱0).`)
          return
        }
        if (form.accepts_transient && !form.accepts_long_term && (!r.price_daily || parseFloat(r.price_daily) <= 0)) {
          setError(`Room #${r.room_number}: Please provide a valid Daily Price (must be greater than ₱0).`)
          return
        }
        if (form.accepts_long_term && form.accepts_transient && (!r.price_monthly || parseFloat(r.price_monthly) <= 0) && (!r.price_daily || parseFloat(r.price_daily) <= 0)) {
          setError(`Room #${r.room_number}: Please provide at least a valid Monthly or Daily Price (must be greater than ₱0).`)
          return
        }
      }
    }

    var imageUrl = form.image_url

    // Upload image if a new file was selected
    if (imageFile) {
      setUploading(true)
      try {
        imageUrl = await uploadPropertyImage(imageFile, propertyId || 'new')
      } catch (err) {
        setError('Image upload failed: ' + (err.message || err))
        setUploading(false)
        return
      }
      setUploading(false)
    }

    var permitUrls = form.permit_urls || []

    if (permitFiles.length > 0) {
      setUploading(true)
      try {
        const uploaded = await uploadPropertyPermit(permitFiles, propertyId || 'new')
        permitUrls = [...permitUrls, ...uploaded]
      } catch (err) {
        setError('Permit upload failed: ' + (err.message || err))
        setUploading(false)
        return
      }
      setUploading(false)
    }

    var payload = Object.assign({}, form, {
      name: form.name.trim(),
      description: form.description.trim(),
      address: `${form.house_number ? form.house_number.trim() + ' ' : ''}${form.street ? form.street.trim() + ', ' : ''}${form.barangay ? 'Brgy. ' + form.barangay.trim() : ''}`.trim().replace(/,$/, ''),
      house_number: form.house_number.trim(),
      street: form.street.trim(),
      barangay: form.barangay.trim(),
      landmark: form.landmark.trim(),
      price_monthly: 0,
      total_rooms: parseInt(form.total_rooms),
      amenities: form.amenities,
      latitude: form.latitude,
      longitude: form.longitude,
      location: form.latitude && form.longitude
        ? 'SRID=4326;POINT(' + form.longitude + ' ' + form.latitude + ')'
        : null,
      image_url: imageUrl,
      permit_urls: permitUrls,
      permit_expires_on: form.permit_expires_on || null,
      accepts_long_term: form.accepts_long_term,
      accepts_transient: form.accepts_transient,
    })

    setUploading(true) // General loading state for combined submit
    try {
      var result = await (isEdit ? updateProperty(propertyId, payload) : createProperty(payload))
      const finalPropertyId = isEdit ? propertyId : result.id

      // Create rooms
      if (!isEdit && roomDrafts.length > 0) {
        await Promise.all(roomDrafts.map(async (draft, index) => {
          let finalUrls = []
          if (draft.imageFiles && draft.imageFiles.length > 0) {
            finalUrls = await uploadRoomImages(draft.imageFiles, 'new_' + index)
          }
          await createRoom({
            property_id: finalPropertyId,
            owner_id: user?.id,
            room_number: draft.room_number,
            floor: parseInt(draft.floor) || 1,
            price_monthly: parseFloat(draft.price_monthly) || 0,
            price_daily: parseFloat(draft.price_daily) || null,
            amenities: draft.amenities,
            notes: draft.notes,
            is_available: draft.is_available,
            image_urls: finalUrls,
          })
        }))
      }
      
      navigate('/owner/properties')
    } catch (err) {
      setError(err.message || (isEdit ? 'Failed to update property.' : 'Failed to create property.'))
    } finally {
      setUploading(false)
    }
  }

  var placeholderImg = PLACEHOLDER_IMAGES[0]

  return (
    <div className="page-enter">
      <Topbar title={isEdit ? 'Edit Property' : 'Add New Property'} />
      <div className="p-6">
        
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-[#FAECE7] border border-[#D85A30] text-[13px] text-[#993C1D]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* ── LEFT COLUMN: Property Details ── */}
            <div className="lg:col-span-6 space-y-6">
              <Card className="p-0 overflow-hidden shadow-sm">
                <div className="p-5 border-b border-stone-100 bg-stone-50/50">
                  <h2 className="font-bold text-lg text-stone-800 flex items-center gap-2">
                    <Home size={18} className="text-[--teal]" />
                    Property Details
                  </h2>
                  <p className="text-[12px] text-stone-500 mt-1">
                    Submitted properties require admin approval.
                  </p>
                </div>

                <div className="p-5 space-y-5">
                  {/* Photo Upload */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-2">
                      Property Photo <span className="text-stone-300 normal-case tracking-normal font-normal">(optional)</span>
                    </label>

                    {imagePreview ? (
                      <div className="relative rounded-2xl overflow-hidden group border border-stone-200">
                        <img src={imagePreview} alt="Property preview" className="w-full h-44 object-cover" />
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
                        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                        onDragLeave={() => setDragOver(false)}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={'relative h-44 rounded-2xl border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ' + (dragOver ? 'border-[--teal] bg-[--teal-light]' : 'border-stone-200 bg-stone-50 hover:border-teal-300 hover:bg-[#F0FAF5]')}
                      >
                        <img src={placeholderImg} alt="placeholder" className="absolute inset-0 w-full h-full object-cover rounded-2xl opacity-[0.03]" />
                        <div className="relative z-10 text-center">
                          <div className="w-10 h-10 rounded-2xl bg-white border border-stone-200 flex items-center justify-center mx-auto mb-2 shadow-sm">
                            <ImagePlus size={18} className="text-stone-400" />
                          </div>
                          <p className="text-[13px] font-medium text-stone-600">Click or drag photo</p>
                          <p className="text-[10px] text-stone-400 mt-0.5">JPG, PNG, WEBP (max 5MB)</p>
                        </div>
                      </div>
                    )}
                    <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handleFileInputChange} />
                  </div>

                  {/* Business Permit */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
                        Business Permit Documents {isEdit ? <span className="text-stone-300 normal-case tracking-normal font-normal">(Already verified/uploaded)</span> : <span className="text-red-400">*</span>}
                      </label>
                      <button type="button" onClick={() => document.getElementById('permit_upload_input').click()} className="text-[10px] bg-teal-50 text-teal-700 px-2.5 py-1 rounded-md font-semibold hover:bg-teal-100 flex items-center gap-1 transition-colors">
                        <Plus size={10} /> Add Permit File
                      </button>
                    </div>
                    
                    <input
                      id="permit_upload_input"
                      type="file"
                      multiple
                      accept="application/pdf,image/jpeg,image/png,image/webp"
                      onChange={(e) => setPermitFiles([...permitFiles, ...Array.from(e.target.files)])}
                      className="hidden"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                      {/* Existing Uploaded Permits */}
                      {form.permit_urls && form.permit_urls.map((url, idx) => (
                        <div key={'existing-'+idx} className="flex items-center gap-3 p-2 bg-white border border-stone-200 rounded-xl cursor-pointer hover:border-teal-300 transition-all" onClick={() => setViewingImage(url)}>
                          <div className={`w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 flex items-center justify-center ${form.status === 'active' ? 'bg-teal-50 text-teal-600' : form.status === 'inactive' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'}`}>
                             {form.status === 'active' ? <CheckCircle2 size={16} /> : form.status === 'inactive' ? <X size={16} /> : <Loader2 size={16} className="animate-spin" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-stone-700 truncate">Existing Permit {idx+1}</p>
                            <p className={`text-[9px] mt-0.5 font-medium ${form.status === 'active' ? 'text-teal-600' : form.status === 'inactive' ? 'text-red-600' : 'text-amber-600'}`}>
                              {form.status === 'active' ? 'Verified' : form.status === 'inactive' ? 'Rejected' : 'Under Review'}
                            </p>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); set('permit_urls', form.permit_urls.filter((_, i) => i !== idx)); }} className="p-1.5 text-stone-400 hover:text-red-500 rounded-md">
                            <X size={12} />
                          </button>
                        </div>
                      ))}

                      {/* Newly Selected Permits */}
                      {permitFiles.map((pFile, idx) => (
                        <div key={'new-'+idx} className="flex items-center gap-3 p-2 bg-white border border-teal-100 rounded-xl cursor-pointer hover:border-teal-300 transition-all group" onClick={() => { setActivePermitPreview(pFile); setPermitPreviewModal(true); }}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-stone-100 flex-shrink-0">
                            {pFile.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(pFile)} className="w-full h-full object-cover" alt="Permit thumbnail" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-stone-500">PDF</div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-medium text-stone-700 truncate">{pFile.name}</p>
                            <p className="text-[9px] text-[--teal] mt-0.5 flex items-center gap-1"><CheckCircle2 size={10} /> Ready to upload</p>
                          </div>
                          <button type="button" onClick={(e) => { e.stopPropagation(); setPermitFiles(permitFiles.filter((_, i) => i !== idx)); }} className="p-1.5 text-stone-400 hover:text-red-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                            <X size={12} />
                          </button>
                        </div>
                      ))}
                    </div>

                    {!isEdit && permitFiles.length === 0 && (!form.permit_urls || form.permit_urls.length === 0) && (
                      <p className="text-[10px] text-stone-400 mt-2">PDF or Image required to list property</p>
                    )}
                    
                    {/* Expiration Date for Permit */}
                    {(permitFiles.length > 0 || isEdit || (form.permit_urls && form.permit_urls.length > 0)) && (
                      <div className="mt-4">
                        <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1">
                          Permit Expiration Date <span className="text-red-400">*</span>
                        </label>
                        <input
                          type="date"
                          required
                          value={form.permit_expires_on}
                          onChange={(e) => set('permit_expires_on', e.target.value)}
                          className="w-full sm:w-1/2 px-3 py-1.5 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 transition-all"
                        />
                      </div>
                    )}
                  </div>

                  {/* Stay Types */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-2">Who do you cater to? *</label>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.accepts_long_term}
                          onChange={(e) => set('accepts_long_term', e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm font-medium text-stone-700">Long-term Boarders (Monthly)</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={form.accepts_transient}
                          onChange={(e) => set('accepts_transient', e.target.checked)}
                          className="w-4 h-4 rounded text-teal-600 focus:ring-teal-500"
                        />
                        <span className="text-sm font-medium text-stone-700">Short-term Transients (Daily)</span>
                      </label>
                    </div>
                    {!form.accepts_long_term && !form.accepts_transient && (
                      <p className="text-[10px] text-red-500 mt-1">Please select at least one.</p>
                    )}
                  </div>

                  {/* Name */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Property Name *</label>
                    <input value={form.name} onChange={function(e) { set('name', e.target.value) }} placeholder="e.g. Casa Ivatan Bed & Board" required className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all" />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Description</label>
                    <textarea rows={2} value={form.description} onChange={function(e) { set('description', e.target.value) }} placeholder="Brief description..." className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all resize-none" />
                  </div>

                  {/* Detailed Address */}
                  <div className="space-y-3">
                    <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block">Detailed Address *</label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input value={form.house_number} onChange={function(e) { set('house_number', e.target.value) }} placeholder="House/Building No." className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all" />
                      </div>
                      <div>
                        <input value={form.street} onChange={function(e) { set('street', e.target.value) }} placeholder="Street Name *" required className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all" />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <input value={form.barangay} onChange={function(e) { set('barangay', e.target.value) }} placeholder="Barangay *" required className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all" />
                      </div>
                      <div>
                        <input value={form.landmark} onChange={function(e) { set('landmark', e.target.value) }} placeholder="Nearest Landmark / Directions" className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all" />
                      </div>
                    </div>
                  </div>

                  {/* Location & Rooms */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Municipality *</label>
                      <select value={form.municipality} onChange={function(e) { 
                          var m = e.target.value
                          var isld = (m === 'Sabtang') ? 'Sabtang' : (m === 'Itbayat') ? 'Itbayat' : 'Batan'
                          setForm(f => Object.assign({}, f, { municipality: m, island: isld }))
                        }} className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30">
                        {MUNICIPALITIES.map(function(m) { return <option key={m} value={m}>{m}</option> })}
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5 text-[--teal] font-bold">Total Rooms *</label>
                      <input type="number" min="1" max="50" value={form.total_rooms} onChange={handleTotalRoomsChange} placeholder="e.g. 5" required className={'w-full px-3 py-2 text-sm rounded-xl border bg-teal-50/50 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all font-semibold text-stone-800 ' + (!form.total_rooms || parseInt(form.total_rooms) < 1 ? 'border-red-300 bg-red-50/30' : 'border-teal-200')} />
                    </div>
                  </div>

                  {/* Amenities */}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium block mb-2">Amenities</label>
                    <div className="flex flex-wrap gap-2">
                      {AMENITY_OPTIONS.map(function(a) {
                        var active = form.amenities.indexOf(a) !== -1
                        return (
                          <button key={a} type="button" onClick={function() { toggleAmenity(a) }} className={'px-3 py-1.5 rounded-full text-[11px] font-medium border transition-all ' + (active ? 'bg-[--teal-light] text-[--teal] border-teal-300' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:text-stone-700')}>
                            {a}
                          </button>
                        )
                      })}
                    </div>
                  </div>

                  {/* Map Picker */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] uppercase tracking-wider text-stone-400 font-medium">
                        Pin Location <span className="text-stone-300 normal-case tracking-normal font-normal">(optional)</span>
                      </label>
                      {form.latitude && form.longitude && (
                        <span className="flex items-center gap-1 text-[10px] text-[--teal] font-medium">
                          <MapPin size={10} /> {form.latitude.toFixed(5)}, {form.longitude.toFixed(5)}
                          <button type="button" onClick={() => setForm(f => ({ ...f, latitude: null, longitude: null }))} className="ml-1 text-stone-400 hover:text-red-500 transition-colors">✕</button>
                        </span>
                      )}
                    </div>
                    <div className="rounded-2xl overflow-hidden border border-stone-200">
                      <PropertyMap mode="pick" lat={form.latitude} lng={form.longitude} properties={otherProperties} onPick={handlePickLocation} height="400px" />
                    </div>
                  </div>
                </div>

                {/* Submit button at the bottom of the left column */}
                <div className="p-5 border-t border-stone-100 bg-stone-50 flex gap-3">
                  <button type="button" onClick={function() { navigate('/owner/properties') }} className="px-5 py-2.5 rounded-xl border border-stone-200 bg-white text-stone-600 text-sm font-medium hover:bg-stone-100 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isLoading || uploading} className="flex-1 px-5 py-2.5 rounded-xl bg-[--teal] text-white text-sm font-bold shadow-sm disabled:opacity-50 hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
                    {(isLoading || uploading) && <Loader2 size={15} className="animate-spin" />}
                    {uploading ? 'Uploading…' : isLoading ? 'Saving…' : 'Submit Property & Rooms'}
                  </button>
                </div>
              </Card>
            </div>

            {/* ── RIGHT COLUMN: Room Drafts ── */}
            <div className="lg:col-span-6">
              {isEdit ? (
                <div className="bg-stone-50 rounded-2xl border border-stone-200 border-dashed p-10 flex flex-col items-center justify-center text-center text-stone-400 h-full min-h-[300px]">
                  <BedDouble size={48} className="text-teal-300 mb-4" />
                  <p className="font-semibold text-stone-600 text-lg mb-2">Manage Property Rooms</p>
                  <p className="text-sm mt-1 max-w-sm mb-6 text-stone-500">
                    To add new rooms, upload room photos, or change room pricing and availability, please use the dedicated room management page.
                  </p>
                  <button
                    type="button"
                    onClick={() => navigate('/owner/rooms/' + propertyId)}
                    className="px-6 py-3 rounded-xl bg-teal-600 text-white font-bold shadow-md hover:bg-teal-700 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2"
                  >
                    <BedDouble size={18} />
                    Manage Rooms Now
                  </button>
                </div>
              ) : roomDrafts.length === 0 ? (
                <div className="bg-stone-50 rounded-2xl border border-stone-200 border-dashed p-10 flex flex-col items-center justify-center text-center text-stone-400 h-[calc(100vh-140px)] min-h-[400px]">
                  <BedDouble size={48} className="text-stone-200 mb-4" />
                  <p className="font-semibold text-stone-600">No rooms set</p>
                  <p className="text-sm mt-1 max-w-sm">Enter the <strong className="text-stone-500">Total Rooms</strong> on the left to start setting up room details here.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 custom-scrollbar">
                  {roomDrafts.map((draft, idx) => (
                    <Card key={draft.id} className="p-0 overflow-hidden shadow-sm border border-[--teal-light]">
                      <div className="px-5 py-3 border-b border-stone-100 bg-[#F0FAF5] flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[--teal] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                          {idx + 1}
                        </div>
                        <h3 className="font-bold text-[#0F6E56] text-sm">Room Details</h3>
                      </div>
                      
                      <div className="p-5 grid grid-cols-1 md:grid-cols-12 gap-5">
                        
                        {/* Room Photos */}
                        <div className="md:col-span-4">
                          <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Room Photos</label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(draft.imagePreviews || []).map((previewUrl, iIdx) => (
                              <div key={iIdx} className="relative rounded-lg overflow-hidden group h-16 bg-stone-100 border border-stone-200">
                                <img src={previewUrl} alt="" className="w-full h-full object-cover" />
                                <button type="button" onClick={() => removeRoomDraftImage(idx, iIdx)} className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-md opacity-0 group-hover:opacity-100 transition-opacity">
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                            <label className="h-16 rounded-lg border-2 border-dashed border-stone-200 bg-stone-50 hover:border-teal-300 hover:bg-[#F0FAF5] cursor-pointer flex flex-col items-center justify-center transition-all text-stone-300 group">
                              <ImagePlus size={16} className="group-hover:text-teal-400 transition-colors" />
                              <input type="file" multiple accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={(e) => handleRoomDraftImages(idx, e.target.files)} />
                            </label>
                          </div>
                        </div>

                        {/* Room Form Fields */}
                        <div className="md:col-span-8 space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Room # *</label>
                              <Input value={draft.room_number} onChange={(e) => updateRoomDraft(idx, 'room_number', e.target.value)} placeholder="101" required className="bg-stone-50 focus:bg-white" />
                            </div>
                            <div>
                              <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Floor</label>
                              <Input type="number" min="1" value={draft.floor} onChange={(e) => updateRoomDraft(idx, 'floor', e.target.value)} placeholder="1" className="bg-stone-50 focus:bg-white" />
                            </div>
                            {form.accepts_long_term && (
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Price (₱/mo) *</label>
                                <Input type="number" min="0" value={draft.price_monthly} onChange={(e) => updateRoomDraft(idx, 'price_monthly', e.target.value)} placeholder="3500" required className="bg-stone-50 focus:bg-white" />
                              </div>
                            )}
                            {form.accepts_transient && (
                              <div>
                                <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5 text-teal-600">Daily Price (₱/day) *</label>
                                <Input type="number" min="0" value={draft.price_daily} onChange={(e) => updateRoomDraft(idx, 'price_daily', e.target.value)} placeholder="500" required className="bg-teal-50/50 focus:bg-white border-teal-200" />
                              </div>
                            )}
                          </div>
                          
                          <div>
                            <label className="text-[10px] uppercase tracking-wider text-stone-400 font-medium block mb-1.5">Amenities</label>
                            <div className="flex flex-wrap gap-1.5">
                              {['WiFi', 'Water', 'Electric', 'Security', 'Kitchen', 'Parking', 'Laundry'].map((a) => (
                                <button key={a} type="button" onClick={() => toggleRoomDraftAmenity(idx, a)} className={'px-2 py-1 rounded-full text-[10px] font-medium border transition-all ' + (draft.amenities.includes(a) ? 'bg-[#E1F5EE] text-[#0F6E56] border-teal-300 shadow-sm' : 'bg-white text-stone-500 border-stone-200 hover:border-stone-300 hover:bg-stone-50')}>
                                  {a}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                        
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

          </div>
        </form>
      </div>

      {permitPreviewModal && activePermitPreview && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 p-4" onClick={() => setPermitPreviewModal(false)}>
          <div className="relative max-w-4xl max-h-[90vh] bg-white rounded-xl overflow-hidden shadow-2xl flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between p-3 border-b border-stone-100">
              <h3 className="font-bold text-sm text-stone-800">Permit Preview</h3>
              <button className="p-1.5 text-stone-400 hover:bg-stone-100 rounded-lg transition-colors" onClick={() => setPermitPreviewModal(false)}>
                <X size={16} />
              </button>
            </div>
            <div className="overflow-auto p-4 flex-1 bg-stone-50 flex items-center justify-center">
              {activePermitPreview.type.startsWith('image/') ? (
                <img src={URL.createObjectURL(activePermitPreview)} alt="Permit Preview" className="max-w-full max-h-[75vh] object-contain rounded-lg shadow-sm" />
              ) : (
                <iframe src={URL.createObjectURL(activePermitPreview)} className="w-[80vw] h-[75vh] max-w-4xl rounded-lg shadow-sm bg-white" title="PDF Preview" />
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
      {/* Render Image Viewer Modal */}
      <ImageViewerModal 
        isOpen={!!viewingImage} 
        imageUrl={viewingImage} 
        onClose={() => setViewingImage(null)} 
      />

    </div>
  )
}
