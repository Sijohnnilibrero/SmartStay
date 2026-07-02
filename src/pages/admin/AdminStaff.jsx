import { useState, useEffect } from 'react'
import { Card, Button, Input, Select, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { Shield, MapPin, UserPlus, Eye, EyeOff } from 'lucide-react'
import NotificationBell from '@/components/layout/NotificationBell'

export default function AdminStaff() {
  const { createAdminAccount } = useAuthStore()
  const { addToast } = useAppStore()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [isCreating, setIsCreating] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    region: 'Batan Island'
  })

  const loadAdmins = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('role', ['admin', 'super_admin'])
      .order('created_at', { ascending: false })
      
    if (!error && data) setAdmins(data)
    setLoading(false)
  }

  useEffect(() => { loadAdmins() }, [])

  const handleCreate = async (e) => {
    e.preventDefault()
    setIsCreating(true)
    const res = await createAdminAccount({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      region: formData.region
    })
    setIsCreating(false)
    
    if (res.success) {
      addToast('Staff member created successfully!', 'success')
      setFormData({ name: '', email: '', password: '', region: 'Batan Island' })
      loadAdmins()
    } else {
      addToast(res.authError, 'error')
    }
  }

  return (
    <div className="page-enter">
      <div className="px-6 pt-5 pb-4 flex items-center justify-between">
        <div>
          <p className="font-bold text-lg md:text-xl text-stone-800">Manage Staff</p>
          <p className="text-sm text-stone-400 mt-0.5">Super Admin privileges: Create and assign territories to Regional Admins.</p>
        </div>
        <NotificationBell />
      </div>

      <div className="p-6 grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: List of Admins */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-semibold text-stone-800 uppercase tracking-wide text-sm">System Administrators</h3>
          {loading ? (
            <p className="text-stone-400 text-sm">Loading staff...</p>
          ) : (
            <div className="space-y-3">
              {admins.map(admin => (
                <Card key={admin.id} className="p-4 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                      {admin.full_name?.substring(0, 2).toUpperCase() || 'AD'}
                    </div>
                    <div>
                      <p className="font-bold text-stone-800 flex items-center gap-2">
                        {admin.full_name}
                        {admin.role === 'super_admin' && (
                          <Badge variant="teal" className="text-[10px] py-0">Super Admin</Badge>
                        )}
                      </p>
                      <p className="text-sm text-stone-500">{admin.email}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-stone-400 uppercase tracking-wider mb-1">Territory</p>
                    <p className="font-medium text-stone-800 flex items-center gap-1 justify-end">
                      <MapPin size={14} className="text-stone-400" />
                      {admin.role === 'super_admin' ? 'Global (All)' : (admin.admin_region || 'Unassigned')}
                    </p>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Create Form */}
        <div>
          <Card className="p-5 sticky top-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
                <UserPlus size={16} />
              </div>
              <h3 className="font-bold text-stone-800">Add Regional Admin</h3>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Full Name</label>
                <Input
                  placeholder="e.g. John Doe"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Email Address</label>
                <Input
                  type="email"
                  placeholder="admin@smartstay.ph"
                  value={formData.email}
                  onChange={e => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">Temporary Password</label>
                <div className="relative">
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                    required
                    minLength={6}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-1.5 ml-1">
                  Assigned Territory
                </label>
                <Select
                  value={formData.region}
                  onChange={e => setFormData({ ...formData, region: e.target.value })}
                  className="w-full"
                >
                  <option value="Batan Island">Batan Island (Basco, Mahatao, Ivana, Uyugan)</option>
                  <option value="Sabtang">Sabtang</option>
                  <option value="Itbayat">Itbayat</option>
                </Select>
              </div>

              <Button type="submit" className="w-full mt-2" disabled={isCreating}>
                {isCreating ? 'Creating...' : 'Create Admin Account'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  )
}
