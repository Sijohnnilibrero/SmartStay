import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Card, Button } from '@/components/ui'
import { User, Mail, Phone, MapPin, Save, CheckCircle, Camera, Maximize2, ShieldCheck, Home, CalendarDays } from 'lucide-react'
import ImageViewerModal from '@/components/ui/ImageViewerModal'

const MUNICIPALITIES = ['Basco', 'Ivana', 'Mahatao', 'Uyugan', 'Sabtang', 'Itbayat']

export default function HomeownerProfile() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const uploadAvatar = useAuthStore((s) => s.uploadAvatar)
  const addToast = useAppStore((s) => s.addToast)
  const fileInputRef = useRef(null)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    contact: '',
    municipality: 'Basco',
    avatar_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [viewingImage, setViewingImage] = useState(false)
  const [stats, setStats] = useState({ properties: 0, reservations: 0 })

  useEffect(() => {
    if (!user?.id) return

    // Fetch Stats
    const fetchStats = async () => {
      try {
        const { data: props } = await supabase.from('properties').select('id').eq('owner_id', user.id)
        const propIds = props?.map(p => p.id) || []
        
        let resCount = 0
        if (propIds.length > 0) {
          const { count } = await supabase.from('reservations').select('id', { count: 'exact', head: true }).in('property_id', propIds).eq('status', 'confirmed')
          resCount = count || 0
        }

        setStats({ properties: propIds.length, reservations: resCount })
      } catch(e) { }
    }
    fetchStats()

    // Fetch fresh profile data
    supabase
      .from('profiles')
      .select('full_name, contact, municipality, email, avatar_url')
      .eq('id', user.id)
      .single()
      .then(({ data }) => {
        setForm({
          full_name: data?.full_name || user.name || '',
          email: data?.email || '',
          contact: data?.contact || '',
          municipality: data?.municipality || user.municipality || 'Basco',
          avatar_url: data?.avatar_url || '',
        })
      })
  }, [user?.id])

  const initials = form.full_name
    ? form.full_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageClick = () => {
    fileInputRef.current?.click()
  }

  const handleAvatarClick = () => {
    if (form.avatar_url) {
      setViewingImage(true)
    } else {
      handleImageClick()
    }
  }

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      addToast('Image must be less than 5MB', 'error')
      return
    }

    setUploadingImage(true)
    try {
      const url = await uploadAvatar(file)
      await updateProfile({ avatar_url: url })
      setForm(prev => ({ ...prev, avatar_url: url }))
      addToast('Profile picture updated!', 'success')
    } catch (err) {
      console.error(err)
      addToast(err.message || 'Failed to upload image', 'error')
    } finally {
      setUploadingImage(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setSaved(false)
    try {
      await updateProfile({
        full_name: form.full_name.trim(),
        contact: form.contact.trim(),
        municipality: form.municipality,
        email: form.email.trim(),
        avatar_url: form.avatar_url
      })
      setSaved(true)
      addToast('Profile updated successfully!', 'success')
      setTimeout(() => setSaved(false), 3000)
    } catch (err) {
      addToast(err.message || 'Failed to update profile.', 'error')
    } finally {
      setSaving(false)
    }
  }

  const trustScore = (() => {
    let score = 0
    if (form.full_name) score += 25
    if (form.email) score += 25
    if (form.contact) score += 25
    if (form.avatar_url) score += 25
    return score
  })()

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-5 pb-2">
        <div>
          <p className="font-bold text-2xl text-stone-800">My Profile</p>
          <p className="text-sm text-stone-400 mt-0.5">Update your contact details so tenants can reach you</p>
        </div>
      </div>

      <div className="p-6 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className="overflow-hidden">
            {/* Avatar Banner */}
            <div
              className="h-28 flex items-end px-6 pb-0 relative"
              style={{ background: 'linear-gradient(135deg, #0F6E56 0%, #1D9E75 100%)' }}
            >
              {/* decorative circles */}
              <div className="absolute -top-4 -right-4 w-28 h-28 rounded-full bg-white/10 pointer-events-none" />
              <div className="absolute -bottom-6 -left-6 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

              {/* Avatar circle — sits half-inside the banner */}
              <div className="relative z-10 translate-y-12">
                <div 
                  className={`w-24 h-24 rounded-2xl shadow-lg border-4 border-white bg-white flex items-center justify-center group overflow-hidden ${form.avatar_url ? 'cursor-pointer' : ''}`} 
                  onClick={handleAvatarClick}
                >
                  {form.avatar_url ? (
                    <>
                      <img src={form.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Maximize2 size={24} className="text-white" />
                      </div>
                    </>
                  ) : (
                    <div
                      className="w-full h-full flex items-center justify-center text-3xl font-bold"
                      style={{ background: '#E1F5EE', color: '#0F6E56' }}
                    >
                      {initials}
                    </div>
                  )}
                </div>
                
                {/* Camera Upload Button */}
                <button 
                  onClick={handleImageClick}
                  disabled={uploadingImage}
                  className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shadow-md border-2 border-white transition-colors disabled:opacity-50"
                  title="Change Profile Picture"
                >
                  {uploadingImage ? (
                    <span className="animate-spin inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full" />
                  ) : (
                    <Camera size={14} />
                  )}
                </button>

                <input type="file" ref={fileInputRef} onChange={handleImageChange} accept="image/*" className="hidden" />
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="px-6 pt-16 pb-6 space-y-5">
              {/* Full Name */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  <User size={12} className="text-stone-400" /> Full Name
                </label>
                <input
                  id="profile-full-name"
                  name="full_name"
                  type="text"
                  value={form.full_name}
                  onChange={handleChange}
                  required
                  placeholder="Your full name"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                />
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  <Mail size={12} className="text-stone-400" /> Email Address
                </label>
                <input
                  id="profile-email"
                  name="email"
                  type="email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  placeholder="your@email.com"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  This email is shown to tenants on their "My Landlord" page as a contact detail.
                </p>
              </div>

              {/* Phone / Contact */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  <Phone size={12} className="text-stone-400" /> Phone / Contact Number
                </label>
                <input
                  id="profile-contact"
                  name="contact"
                  type="tel"
                  value={form.contact}
                  onChange={handleChange}
                  placeholder="+63 912 345 6789"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-800 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all"
                />
                <p className="text-[10px] text-stone-400 mt-1">
                  Tenants will see this number on their "My Landlord" page.
                </p>
              </div>

              {/* Municipality */}
              <div>
                <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-stone-500 mb-1.5">
                  <MapPin size={12} className="text-stone-400" /> Municipality
                </label>
                <select
                  id="profile-municipality"
                  name="municipality"
                  value={form.municipality}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 bg-stone-50 text-sm text-stone-800 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400 transition-all appearance-none cursor-pointer"
                >
                  {MUNICIPALITIES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>

              {/* Save Button */}
              <div className="pt-2">
                <Button
                  id="profile-save-btn"
                  type="submit"
                  variant="primary"
                  className="w-full sm:w-auto flex items-center justify-center gap-2 min-w-[160px]"
                  disabled={saving || uploadingImage}
                >
                  {saved ? (
                    <><CheckCircle size={15} /> Saved!</>
                  ) : saving ? (
                    <><span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full" /> Saving…</>
                  ) : (
                    <><Save size={15} /> Save Changes</>
                  )}
                </Button>
              </div>
            </form>
          </Card>

          {/* Info card */}
          <Card className="mt-4 p-4 border-l-4 border-l-teal-400">
            <h4 className="text-[12px] font-semibold text-stone-800 mb-1">Why does this matter?</h4>
            <p className="text-[11px] text-stone-500 leading-relaxed">
              Your phone number and email are displayed to tenants who have confirmed bookings with you.
              Keeping these up to date ensures your tenants can reach you quickly for any concerns.
            </p>
          </Card>
        </div>

        {/* Right Column: Trust Score & Activity */}
        <div className="lg:col-span-1 space-y-6">
          
          {/* Trust Score */}
          <Card className="p-6 border border-stone-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-600">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h3 className="font-bold text-stone-800">Profile Completeness</h3>
                <p className="text-xs text-stone-500">Build trust with tenants</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-full bg-stone-100 rounded-full h-2.5 overflow-hidden">
                <div 
                  className={`h-2.5 rounded-full transition-all duration-500 ${trustScore === 100 ? 'bg-teal-500' : 'bg-amber-500'}`}
                  style={{ width: `${trustScore}%` }}
                ></div>
              </div>
              
              <ul className="space-y-2.5 text-sm text-stone-600">
                <li className="flex items-center gap-2">
                  {form.full_name ? <CheckCircle size={14} className="text-teal-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-300" />}
                  Full Name Added
                </li>
                <li className="flex items-center gap-2">
                  {form.email ? <CheckCircle size={14} className="text-teal-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-300" />}
                  Email Confirmed
                </li>
                <li className="flex items-center gap-2">
                  {form.contact ? <CheckCircle size={14} className="text-teal-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-300" />}
                  Phone Number
                </li>
                <li className="flex items-center gap-2">
                  {form.avatar_url ? <CheckCircle size={14} className="text-teal-500" /> : <div className="w-3.5 h-3.5 rounded-full border-2 border-stone-300" />}
                  Profile Photo
                </li>
              </ul>

              {trustScore === 100 && (
                <div className="mt-4 p-3 bg-teal-50 border border-teal-100 rounded-lg text-xs text-teal-800 font-medium flex items-start gap-2">
                  <span>🎉</span> Your profile is complete! Tenants can reach out to you seamlessly.
                </div>
              )}
            </div>
          </Card>

          {/* Activity Summary */}
          <Card className="p-6 border border-stone-200 bg-gradient-to-br from-stone-50 to-stone-100/50">
            <h3 className="font-bold text-stone-800 mb-4">My Activity</h3>
            
            <div className="space-y-4">
              <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-stone-100">
                <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <Home size={18} />
                </div>
                <div>
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Properties</p>
                  <p className="text-lg font-bold text-stone-800">{stats.properties}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-white p-3 rounded-xl shadow-sm border border-stone-100">
                <div className="w-10 h-10 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <CalendarDays size={18} />
                </div>
                <div>
                  <p className="text-xs text-stone-400 font-medium uppercase tracking-wider">Confirmed Guests</p>
                  <p className="text-lg font-bold text-stone-800">{stats.reservations}</p>
                </div>
              </div>
            </div>
          </Card>

        </div>
      </div>
      
      <ImageViewerModal 
        isOpen={viewingImage} 
        imageUrl={form.avatar_url} 
        onClose={() => setViewingImage(false)} 
      />
    </div>
  )
}
