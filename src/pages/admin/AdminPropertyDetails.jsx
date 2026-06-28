import { useState, useEffect, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, Badge, OccupancyBar, Button, ZoomableImage } from '@/components/ui'
import { formatCurrency } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { MapPin, ArrowLeft, Star, BedDouble, User, CheckCircle, XCircle, Trash2, Home, Upload, FileText, Download, Mail, Phone, Calendar } from 'lucide-react'
import PropertyMap from '@/components/map/PropertyMap'
import { supabase } from '@/lib/supabase'

export default function AdminPropertyDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  
  const fetchProperty = useAuthStore((s) => s.fetchProperty)
  const fetchRooms = useAuthStore((s) => s.fetchRooms)
  const fetchProperties = useAuthStore((s) => s.fetchProperties)
  const updatePropertyStatus = useAuthStore((s) => s.updatePropertyStatus)
  const deleteProperty = useAuthStore((s) => s.deleteProperty)
  const user = useAuthStore((s) => s.user)
  const addToast = useAppStore((s) => s.addToast)

  const [property, setProperty] = useState(null)
  const [ownerProfile, setOwnerProfile] = useState(null)
  const [rooms, setRooms] = useState([])
  const [allProperties, setAllProperties] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(null)
  const [confirmAction, setConfirmAction] = useState(null)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')
  const [permitModalUrl, setPermitModalUrl] = useState(null)
  const [rejectionReasonText, setRejectionReasonText] = useState('')

  const loadProperty = useCallback(() => {
    setLoading(true)
    Promise.all([
      fetchProperty(id),
      fetchRooms(id),
      fetchProperties({}),
    ]).then(async (results) => {
      const prop = results[0]
      setProperty(prop)
      setRooms(results[1] || [])
      setAllProperties(results[2] || [])
      
      if (prop && prop.owner_id) {
        const { data: owner } = await supabase.from('profiles').select('*').eq('id', prop.owner_id).single()
        setOwnerProfile(owner)
      }
      setLoading(false)
    }).catch((err) => {
      console.error(err)
      setLoading(false)
    })
  }, [id, fetchProperty, fetchRooms, fetchProperties])

  useEffect(() => { loadProperty() }, [loadProperty])

  if (loading) {
    return (
      <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto animate-pulse">
        <div className="h-8 bg-stone-200 rounded w-1/4" />
        <div className="h-[400px] bg-stone-200 rounded-2xl w-full" />
      </div>
    )
  }

  if (!property) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-stone-800">Property not found</h2>
        <Button className="mt-4" onClick={() => navigate('/admin/properties')}>Go Back</Button>
      </div>
    )
  }

  const occupiedRooms = property.total_rooms - (property.available_rooms || 0)
  const statusColors = { pending_review: 'amber', active: 'teal', inactive: 'gray', full: 'coral' }

  const handleStatusChange = (status) => {
    setActioning('status')
    updatePropertyStatus(id, status, status === 'inactive' ? rejectionReasonText : null).then(() => {
      setProperty(prev => ({ ...prev, status, rejection_reason: status === 'inactive' ? rejectionReasonText : null }))
      setConfirmAction(null)
      setRejectionReasonText('')
    }).catch(err => {
      addToast('Failed to update status: ' + err.message, 'error')
    }).finally(() => setActioning(null))
  }

  const handleDelete = () => {
    setActioning('delete')
    deleteProperty(id).then(() => {
      navigate('/admin/properties')
    }).catch(err => {
      addToast('Failed to delete: ' + err.message, 'error')
    }).finally(() => setActioning(null))
  }

  return (
    <div className="min-h-screen bg-[#f5f4f0] pb-24 font-['Plus_Jakarta_Sans']">
      <div className="bg-white border-b border-stone-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-stone-500 hover:text-stone-800 transition-colors text-sm font-medium">
            <ArrowLeft size={16} /> Back to Properties
          </button>
          <Badge variant={statusColors[property.status] || 'gray'} className="capitalize">
            {property.status.replace('_', ' ')}
          </Badge>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 pt-6 sm:pt-8 space-y-6">
        
        {/* Header Title */}
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-stone-800">{property.name}</h1>
          <div className="flex items-center gap-2 text-stone-500 mt-2 text-sm">
            <MapPin size={14} />
            <span>{property.address || property.municipality}</span>
          </div>
        </div>

        {/* Hero Image */}
        <div className="h-[300px] sm:h-[400px] rounded-3xl overflow-hidden shadow-sm border border-stone-200 bg-stone-100 flex items-center justify-center">
          {property.image_url ? (
            <img src={property.image_url} alt={property.name} className="w-full h-full object-cover" />
          ) : (
            <div className="text-stone-300 flex flex-col items-center justify-center gap-2 opacity-70">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
              <span className="text-sm font-semibold uppercase tracking-wider">No Property Photo</span>
            </div>
          )}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column (Details) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* About */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold text-stone-800 mb-4">About this property</h3>
                <p className="text-stone-600 text-sm leading-relaxed">{property.description || 'No description provided.'}</p>
              </div>
            </Card>

            {/* Occupancy & Stats */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold text-stone-800 mb-4">Availability Stats</h3>
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100">
                  <OccupancyBar 
                    label={`${occupiedRooms}/${property.total_rooms} rooms unavailable`} 
                    value={occupiedRooms} 
                    max={property.total_rooms} 
                  />
                  <div className="mt-4 flex gap-6 text-sm">
                    <div>
                      <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Total Rooms</p>
                      <p className="font-bold text-stone-800">{property.total_rooms}</p>
                    </div>
                    <div>
                      <p className="text-stone-500 text-xs uppercase tracking-wider mb-1">Available</p>
                      <p className="font-bold text-[#0F6E56]">{property.available_rooms}</p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {/* Amenities */}
            {property.amenities && property.amenities.length > 0 && (
              <Card>
                <div className="p-6">
                  <h3 className="text-lg font-bold text-stone-800 mb-4">Amenities</h3>
                  <div className="flex flex-wrap gap-2">
                    {property.amenities.map(a => (
                      <span key={a} className="bg-stone-100 text-stone-600 px-3 py-1.5 rounded-full text-sm font-medium">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              </Card>
            )}

            {/* Map */}
            <Card>
              <div className="p-6">
                <h3 className="text-lg font-bold text-stone-800 mb-4">Location</h3>
                <div className="h-[300px] rounded-2xl overflow-hidden border border-stone-200">
                  <PropertyMap lat={property.latitude} lng={property.longitude} properties={allProperties} />
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column (Admin Panel) */}
          <div className="space-y-6">
            
            {/* Moderation Controls */}
            <Card>
              <div className="p-6 space-y-4">
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4">Moderation Actions</h3>
                
                {(property.permit_urls && property.permit_urls.length > 0) || property.permit_url ? (
                  <div className="mb-4 space-y-2">
                    {(property.permit_urls && property.permit_urls.length > 0 ? property.permit_urls : [property.permit_url]).map((url, i) => (
                      <button key={i} type="button" onClick={() => setPermitModalUrl(url)} className="flex items-center justify-center w-full py-2.5 text-sm font-medium text-[--teal] border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-xl transition-colors">
                        <FileText size={16} className="mr-2" /> View Business Permit {property.permit_urls && property.permit_urls.length > 1 ? i + 1 : ''}
                      </button>
                    ))}
                    {property.permit_expires_on && (
                      <p className={`text-center text-[10px] sm:text-xs mt-1.5 font-medium ${new Date(property.permit_expires_on) < new Date() ? 'text-red-500' : 'text-stone-500'}`}>
                        {new Date(property.permit_expires_on) < new Date() ? 'Expired on: ' : 'Expires: '} {new Date(property.permit_expires_on).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-full py-2 text-sm text-stone-500 bg-stone-50 border border-stone-200 rounded-xl mb-4 italic">
                    <FileText size={14} className="mr-2 opacity-50" /> No permit uploaded
                  </div>
                )}
                
                {property.status === 'pending_review' && (
                  <div className="flex gap-2">
                    <Button variant="primary" className="flex-1 justify-center" onClick={() => setConfirmAction('approve')} disabled={actioning}>
                      <CheckCircle size={16} className="mr-1" /> Approve
                    </Button>
                    <Button variant="danger" className="flex-1 justify-center" onClick={() => setConfirmAction('reject')} disabled={actioning}>
                      <XCircle size={16} className="mr-1" /> Reject
                    </Button>
                  </div>
                )}
                
                {property.status === 'active' && (
                  <Button variant="ghost" className="w-full justify-center bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200" onClick={() => setConfirmAction('reject')} disabled={actioning}>
                    Set to Inactive
                  </Button>
                )}
                {property.status === 'inactive' && (
                  <Button variant="ghost" className="w-full justify-center bg-[#E1F5EE] text-[#0F6E56] hover:bg-[#d0ebe0] border border-[#a4dfc8]" onClick={() => setConfirmAction('approve')} disabled={actioning}>
                    Set to Active
                  </Button>
                )}

                <div className="border-t border-stone-100 pt-4 mt-2">
                  <Button variant="ghost" className="w-full justify-center text-red-600 hover:bg-red-50" onClick={() => setConfirmAction('delete')} disabled={actioning}>
                    <Trash2 size={16} className="mr-1" /> Delete Property
                  </Button>
                </div>
              </div>
            </Card>

            {/* Owner Details */}
            {ownerProfile && (
              <Card>
                <div className="p-6 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-[#E1F5EE] text-[#0F6E56] font-bold text-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                    {(ownerProfile.full_name || '??').split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                  </div>
                  <h3 className="font-bold text-lg text-stone-800">{ownerProfile.full_name}</h3>
                  <p className="text-sm text-stone-500 mb-5">Homeowner</p>

                  <div className="space-y-3 text-left bg-stone-50 rounded-2xl p-4 border border-stone-100">
                    <div className="flex items-center gap-3 text-sm text-stone-600">
                      <Mail size={14} className="text-stone-400" />
                      <span className="truncate">{ownerProfile.email || 'No email'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-600">
                      <Phone size={14} className="text-stone-400" />
                      <span>{ownerProfile.contact || 'No phone number'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-600">
                      <MapPin size={14} className="text-stone-400" />
                      <span>{ownerProfile.municipality || 'No location'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-sm text-stone-600">
                      <Calendar size={14} className="text-stone-400" />
                      <span>Joined {new Date(ownerProfile.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            {/* Rooms Summary */}
            <Card>
              <div className="p-6">
                <h3 className="text-sm font-bold text-stone-800 uppercase tracking-wider mb-4">Rooms ({rooms.length})</h3>
                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2 hide-scrollbar">
                  {rooms.length === 0 ? (
                    <p className="text-sm text-stone-500 italic text-center py-4">No rooms added yet.</p>
                  ) : (
                    rooms.map(r => (
                      <div key={r.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                        <div>
                          <p className="text-sm font-semibold text-stone-800">Room {r.room_number}</p>
                          <p className="text-xs text-stone-500">{formatCurrency(r.price_monthly)}/mo</p>
                        </div>
                        <Badge variant={r.is_available ? 'teal' : (r.status === 'ongoing_transaction' ? 'amber' : 'coral')}>
                          {r.is_available ? 'Available' : (r.status === 'ongoing_transaction' ? 'Ongoing Transaction' : 'Occupied')}
                        </Badge>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>

          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="font-bold text-xl text-stone-800 mb-2 text-center">
              {confirmAction === 'approve' ? 'Approve Property' : confirmAction === 'reject' ? 'Reject Property' : 'Delete Property'}
            </h3>
            
            <p className="text-sm text-stone-600 mb-6 text-center">
              {confirmAction === 'approve' ? 'This property will go live and tenants can start booking.' :
               confirmAction === 'reject' ? 'This property will be hidden from tenants.' :
               'Are you sure you want to delete this property? All rooms and reservations will be permanently lost.'}
            </p>

            {confirmAction === 'reject' && (
              <div className="mb-6">
                <textarea 
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-500/50" 
                  rows="3" 
                  placeholder="Reason for rejection (Optional)"
                  value={rejectionReasonText}
                  onChange={(e) => setRejectionReasonText(e.target.value)}
                ></textarea>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="ghost" className="flex-1 bg-stone-100 text-stone-700" onClick={() => { setConfirmAction(null); setDeleteConfirmText(''); setRejectionReasonText(''); }}>Cancel</Button>
              <Button 
                className="flex-1 text-white"
                style={{ background: confirmAction === 'approve' ? '#0F6E56' : '#DC2626' }}
                onClick={() => confirmAction === 'delete' ? handleDelete() : handleStatusChange(confirmAction === 'approve' ? 'active' : 'inactive')}
                disabled={actioning}
              >
                {actioning ? 'Processing...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Permit Modal */}
      {permitModalUrl && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8 backdrop-blur-sm" onClick={() => setPermitModalUrl(null)}>
          <button 
            className="absolute top-6 right-6 text-white/70 hover:text-white bg-black/50 hover:bg-black/80 rounded-full p-2 transition-all"
            onClick={() => setPermitModalUrl(null)}
          >
            <XCircle size={28} />
          </button>
          
          
          <ZoomableImage 
            src={permitModalUrl} 
            alt="Business Permit" 
            className="w-full h-full max-h-[90vh]" 
          />
        </div>,
        document.body
      )}
    </div>
  )
}
