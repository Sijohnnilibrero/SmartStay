import { useState, useEffect } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { Card, Button } from '@/components/ui'
import { User, Mail, Phone, MapPin, Save, CheckCircle } from 'lucide-react'

const MUNICIPALITIES = ['Basco', 'Itbayat', 'Ivana', 'Mahatao', 'Sabtang', 'Uyugan']

export default function HomeownerProfile() {
  const user = useAuthStore((s) => s.user)
  const updateProfile = useAuthStore((s) => s.updateProfile)
  const addToast = useAppStore((s) => s.addToast)

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    contact: '',
    municipality: 'Basco',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.name || '',
        email: user.email || '',
        contact: user.contact || '',
        municipality: user.municipality || 'Basco',
      })
    }
  }, [user])

  const initials = form.full_name
    ? form.full_name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
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

  return (
    <div className="page-enter">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 px-6 pt-5 pb-2">
        <div>
          <p className="font-bold text-2xl text-stone-800">My Profile</p>
          <p className="text-sm text-stone-400 mt-0.5">Update your contact details so tenants can reach you</p>
        </div>
      </div>

      <div className="p-6 max-w-2xl">
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
            <div
              className="relative z-10 w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-lg border-4 border-white translate-y-10"
              style={{ background: '#E1F5EE', color: '#0F6E56' }}
            >
              {initials}
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-6 pt-14 pb-6 space-y-5">
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
                Changing your email will require a confirmation link sent to the new address.
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
                disabled={saving}
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
    </div>
  )
}
