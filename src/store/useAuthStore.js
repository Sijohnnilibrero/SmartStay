import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase'
import { createClient } from '@supabase/supabase-js'

export const DEMO_ACCOUNTS = [
  {
    id: 'demo-admin-001', email: 'admin@smartstay.ph', password: 'admin123',
    role: 'admin', name: 'Rico Dimalanta', initials: 'RD',
    avatar: null, municipality: 'Basco',
  },
  {
    id: 'demo-owner-001', email: 'owner@smartstay.ph', password: 'owner123',
    role: 'owner', name: 'Lola Fina Maravilla', initials: 'FM',
    avatar: null, municipality: 'Basco', property_name: 'Casa Ivatan Bed & Board',
  },
  {
    id: 'demo-tenant-001', email: 'tenant@smartstay.ph', password: 'tenant123',
    role: 'tenant', name: 'Maria Reyes', initials: 'MR',
    avatar: null, municipality: 'Basco', tenant_type: 'Student',
  },
]

function toInitials(name = '') {
  return name.trim().split(' ').map((n) => n[0]).slice(0, 2).join('').toUpperCase()
}

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      authError: null,

      // ── REAL Supabase login ──────────────────────────────────────────────
      login: async (email, password) => {
        set({ isLoading: true, authError: null })
        try {
          const { data, error } = await supabase.auth.signInWithPassword({
            email: email.trim().toLowerCase(),
            password,
          })
          if (error) {
            set({ isLoading: false, authError: error.message })
            return { success: false, authError: error.message }
          }
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single()
          if (profileError || !profile) {
            set({ isLoading: false, authError: 'Profile not found. Contact admin.' })
            return { success: false, authError: 'Profile not found. Contact admin.' }
          }
          if (profile.status === 'banned') {
            await supabase.auth.signOut()
            set({ isLoading: false, authError: 'Your account has been banned. Contact administration.' })
            return { success: false, authError: 'Your account has been banned. Contact administration.' }
          }
          if (profile.status === 'suspended') {
            await supabase.auth.signOut()
            set({ isLoading: false, authError: 'Your account is temporarily suspended. Contact administration.' })
            return { success: false, authError: 'Your account is temporarily suspended. Contact administration.' }
          }
          let actualName = profile.full_name;
          if (!actualName && data.user.user_metadata?.full_name) {
            actualName = data.user.user_metadata.full_name;
            // Silently fix the database if the trigger missed it
            supabase.from('profiles').update({ full_name: actualName }).eq('id', profile.id).then();
          }

          const user = {
            id: profile.id,
            email: data.user.email,
            role: profile.role,
            name: actualName,
            initials: toInitials(actualName || data.user.email),
            avatar: profile.avatar_url,
            municipality: profile.municipality,
            tenant_type: profile.tenant_type,
            contact: profile.contact || '',
            preferences: profile.preferences || null,
            admin_region: profile.admin_region || null,
          }
          set({ user, isLoading: false, authError: null })
          return { success: true, user }
        } catch (err) {
          const errMsg = err?.message || String(err)
          set({ isLoading: false, authError: 'Something went wrong: ' + errMsg })
          return { success: false, authError: 'Something went wrong: ' + errMsg }
        }
      },

      // ── REAL Supabase register ───────────────────────────────────────────
      register: async ({ email, password, name, role, tenantType, municipality }) => {
        set({ isLoading: true, authError: null })
        try {
          const roleValue = ['super_admin', 'admin', 'owner', 'tenant'].includes(role) ? role : 'tenant'
          const tenantTypeValue = ['student', 'professional', 'government_employee', 'visitor'].includes(tenantType) ? tenantType : null

          const { data, error } = await supabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: {
                full_name: name.trim() || email.trim().toLowerCase(),
                role: roleValue,
                tenant_type: tenantTypeValue,
                municipality: municipality || 'Basco',
              }
            }
          })

          if (error) {
            set({ isLoading: false, authError: error.message })
            return { success: false, authError: error.message }
          }

          if (!data?.user?.id) {
            set({ isLoading: false, authError: 'User creation failed (no user id returned).' })
            return { success: false, authError: 'User creation failed (no user id returned).' }
          }

          // We no longer manually insert into 'profiles' here.
          // A Supabase database trigger will automatically catch the metadata
          // passed in 'options.data' above and insert the row into 'profiles' for us!

          // If data.session is null, Supabase requires email confirmation before login.
          // If data.session exists, confirmation is OFF and the user can log in immediately.
          const needsConfirmation = !data.session

          set({ isLoading: false })
          return { success: true, needsConfirmation }
        } catch (err) {
          set({ isLoading: false, authError: 'Registration failed: ' + (err.message || err) })
          return { success: false, authError: 'Registration failed: ' + (err.message || err) }
        }
      },

      // ── Create Admin Account (Super Admin only) ──────────────────────────
      createAdminAccount: async ({ email, password, name, region }) => {
        set({ isLoading: true, authError: null })
        try {
          // Use a secondary client so we don't log out the Super Admin
          const adminSupabase = createClient(
            import.meta.env.VITE_SUPABASE_URL,
            import.meta.env.VITE_SUPABASE_ANON_KEY,
            { auth: { persistSession: false, autoRefreshToken: false } }
          )

          const { data, error } = await adminSupabase.auth.signUp({
            email: email.trim().toLowerCase(),
            password,
            options: {
              data: {
                full_name: name.trim() || email.trim().toLowerCase(),
                role: 'admin',
                tenant_type: null,
                municipality: 'Basco', // default
              }
            }
          })

          if (error) throw error
          if (!data?.user?.id) throw new Error('Failed to create admin user ID')

          // Update the profile with the assigned region manually since it's a special field
          const { error: profError } = await supabase
            .from('profiles')
            .update({ admin_region: region })
            .eq('id', data.user.id)
            
          if (profError) throw profError

          set({ isLoading: false })
          return { success: true }
        } catch (err) {
          set({ isLoading: false, authError: 'Admin creation failed: ' + (err.message || err) })
          return { success: false, authError: 'Admin creation failed: ' + (err.message || err) }
        }
      },

      // ── REAL Supabase logout ─────────────────────────────────────────────
      logout: async () => {
        await supabase.auth.signOut()
        set({ user: null, authError: null })
      },

      // ── Restore session on page reload ───────────────────────────────────
      restoreSession: async () => {
        const { data } = await supabase.auth.getSession()
        if (!data.session) return
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', data.session.user.id)
          .single()
        if (!profile) return
        if (profile.status === 'banned' || profile.status === 'suspended') {
          await supabase.auth.signOut()
          return
        }
        set({
          user: {
            id: profile.id,
            email: data.session.user.email,
            role: profile.role,
            name: profile.full_name,
            initials: toInitials(profile.full_name),
            avatar: profile.avatar_url,
            municipality: profile.municipality,
            tenant_type: profile.tenant_type,
            contact: profile.contact || '',
            preferences: profile.preferences || null,
            admin_region: profile.admin_region || null,
          },
        })
      },

      // ── Update Profile ───────────────────────────────────────────────────
      updateProfile: async ({ full_name, contact, municipality, email, avatar_url }) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')

        const payload = { full_name, contact, municipality, email }
        if (avatar_url !== undefined) {
          payload.avatar_url = avatar_url
        }

        // Update profiles table
        const { error: profileError } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id)

        if (profileError) throw new Error('Profile update failed: ' + profileError.message)

        // Refresh in-memory user state
        set({
          user: {
            ...user,
            name: full_name,
            initials: toInitials(full_name),
            contact,
            municipality,
            email: email || user.email,
            ...(avatar_url !== undefined && { avatar: avatar_url }),
          },
        })
      },

      saveTenantPreferences: async (preferences) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')

        const { error: profileError } = await supabase
          .from('profiles')
          .update({ preferences })
          .eq('id', user.id)

        if (profileError) throw new Error('Failed to save preferences: ' + profileError.message)

        set({
          user: {
            ...user,
            preferences,
          },
        })
      },

      // ── Demo login (keep for offline testing) ────────────────────────────
      loginDemo: (email, password) => {
        set({ isLoading: true, authError: null })
        const found = DEMO_ACCOUNTS.find(
          (a) => a.email === email.trim().toLowerCase() && a.password === password
        )
        if (found) {
          const { password: _, ...safeUser } = found
          set({ user: safeUser, isLoading: false, authError: null })
          return { success: true, user: safeUser }
        } else {
          set({ isLoading: false, authError: 'Invalid email or password.' })
          return { success: false }
        }
      },

      isTenant: () => get().user?.role === 'tenant',
      isOwner: () => get().user?.role === 'owner',
      isAdmin: () => get().user?.role === 'admin' || get().user?.role === 'super_admin',
      isSuperAdmin: () => get().user?.role === 'super_admin',
      clearError: () => set({ authError: null }),

      // ── Properties ────────────────────────────────────────────────────────
      fetchProperties: async (filters = {}) => {
        let query = supabase.from('properties').select('*').order('created_at', { ascending: false })
        if (filters.status) query = query.eq('status', filters.status)
        if (filters.island) query = query.eq('island', filters.island)
        if (filters.municipality) query = query.eq('municipality', filters.municipality)
        if (filters.ownerId) query = query.eq('owner_id', filters.ownerId)
        const { data, error } = await query
        if (error) throw error

        if (!data || data.length === 0) return []

        const propIds = data.map(p => p.id)
        const ownerIds = [...new Set(data.map(p => p.owner_id).filter(Boolean))]

        let ownersMap = {}
        if (ownerIds.length > 0) {
          const { data: owners } = await supabase.from('profiles').select('id, full_name, avatar_url, email, contact, municipality').in('id', ownerIds)
          ;(owners || []).forEach(o => ownersMap[o.id] = o)
        }

        const { data: reviews } = await supabase.from('reviews').select('property_id, rating').in('property_id', propIds)
        
        if (reviews) {
          const ratingMap = {}
          reviews.forEach(r => {
            if (!ratingMap[r.property_id]) ratingMap[r.property_id] = { sum: 0, count: 0 }
            ratingMap[r.property_id].sum += (r.rating || 0)
            ratingMap[r.property_id].count += 1
          })
          
          data.forEach(p => {
            if (ratingMap[p.id]) {
              p.review_count = ratingMap[p.id].count
              p.rating = Math.round((ratingMap[p.id].sum / p.review_count) * 10) / 10
            } else {
              p.review_count = 0
              p.rating = 0
            }
          })
        }

        const { data: rooms } = await supabase.from('rooms').select('property_id, price_daily, is_available').in('property_id', propIds)
        if (rooms) {
          const priceDailyMap = {}
          rooms.forEach(r => {
            if (r.is_available && r.price_daily > 0) {
              if (!priceDailyMap[r.property_id] || r.price_daily < priceDailyMap[r.property_id]) {
                priceDailyMap[r.property_id] = r.price_daily
              }
            }
          })
          data.forEach(p => {
            p.price_daily = priceDailyMap[p.id] || 0
          })
        }

        return data.map(p => {
          const owner = ownersMap[p.owner_id] || {}
          return {
            ...p,
            owner_name: owner.full_name || 'Unknown Owner',
            owner_avatar: owner.avatar_url || null,
            owner_email: owner.email || null,
            owner_contact: owner.contact || null,
            owner_municipality: owner.municipality || null
          }
        })
      },

      fetchProperty: async (id) => {
        const { data, error } = await supabase.from('properties').select('*').eq('id', id).single()
        if (error) throw error

        const { data: reviews } = await supabase.from('reviews').select('rating').eq('property_id', id)
        if (reviews && reviews.length > 0) {
          data.review_count = reviews.length
          data.rating = Math.round((reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length) * 10) / 10
        } else {
          data.review_count = 0
          data.rating = 0
        }

        return data
      },

      uploadAvatar: async (file) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const ext = file.name.split('.').pop()
        const path = `avatars/${user.id}_${Date.now()}.${ext}`
        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (error) throw error
        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path)
        return urlData.publicUrl
      },

      uploadPropertyImage: async (file, propertyId) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${propertyId || 'new'}_${Date.now()}.${ext}`
        const { data, error } = await supabase.storage
          .from('property-images')
          .upload(path, file, { upsert: true, contentType: file.type })
        if (error) throw error
        const { data: urlData } = supabase.storage
          .from('property-images')
          .getPublicUrl(data.path)
        return urlData.publicUrl
      },

      uploadPropertyPermit: async (files, propertyId) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        
        // Handle single file for backward compatibility
        const fileArray = Array.isArray(files) ? files : [files]
        
        const uploadPromises = fileArray.map(async (file, idx) => {
          const ext = file.name.split('.').pop()
          const path = `${user.id}/${propertyId || 'new'}_permit_${Date.now()}_${idx}.${ext}`
          const { data, error } = await supabase.storage
            .from('property-permits')
            .upload(path, file, { upsert: true, contentType: file.type })
          if (error) throw error
          const { data: urlData } = supabase.storage
            .from('property-permits')
            .getPublicUrl(data.path)
          return urlData.publicUrl
        })
        
        return Promise.all(uploadPromises)
      },

      createProperty: async (propertyData) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const { data, error } = await supabase.from('properties').insert({
          owner_id: user.id,
          name: propertyData.name,
          description: propertyData.description || '',
          address: propertyData.address,
          house_number: propertyData.house_number || '',
          street: propertyData.street || '',
          barangay: propertyData.barangay || '',
          landmark: propertyData.landmark || '',
          municipality: propertyData.municipality,
          island: propertyData.island,
          price_monthly: propertyData.price_monthly,
          total_rooms: propertyData.total_rooms || 1,
          available_rooms: propertyData.total_rooms || 1,
          status: 'pending_review',
          amenities: propertyData.amenities || [],
          latitude: propertyData.latitude || null,
          longitude: propertyData.longitude || null,
          location: propertyData.location || null,
          image_url: propertyData.image_url || null,
          permit_urls: propertyData.permit_urls || [],
          permit_expires_on: propertyData.permit_expires_on || null,
          accepts_long_term: propertyData.accepts_long_term !== undefined ? propertyData.accepts_long_term : true,
          accepts_transient: propertyData.accepts_transient !== undefined ? propertyData.accepts_transient : false,
        }).select().single()
        if (error) throw error
        return data
      },

      updateProperty: async (id, propertyData) => {
        const { data, error } = await supabase.from('properties').update({
          name: propertyData.name,
          description: propertyData.description || '',
          address: propertyData.address,
          house_number: propertyData.house_number !== undefined ? propertyData.house_number : undefined,
          street: propertyData.street !== undefined ? propertyData.street : undefined,
          barangay: propertyData.barangay !== undefined ? propertyData.barangay : undefined,
          landmark: propertyData.landmark !== undefined ? propertyData.landmark : undefined,
          municipality: propertyData.municipality,
          island: propertyData.island,
          price_monthly: propertyData.price_monthly,
          total_rooms: propertyData.total_rooms || 1,
          status: 'pending_review',
          amenities: propertyData.amenities || [],
          latitude: propertyData.latitude,
          longitude: propertyData.longitude,
          location: propertyData.location || null,
          image_url: propertyData.image_url !== undefined ? propertyData.image_url : undefined,
          permit_urls: propertyData.permit_urls !== undefined ? propertyData.permit_urls : undefined,
          permit_expires_on: propertyData.permit_expires_on !== undefined ? propertyData.permit_expires_on : undefined,
          accepts_long_term: propertyData.accepts_long_term !== undefined ? propertyData.accepts_long_term : undefined,
          accepts_transient: propertyData.accepts_transient !== undefined ? propertyData.accepts_transient : undefined,
        }).eq('id', id).select().single()
        if (error) throw error
        return data
      },

      updatePropertyStatus: async (id, status, reason = null) => {
        const updateData = { status }
        if (status === 'active') {
          updateData.rejection_reason = null // Clear reason on approval
        } else if (status === 'inactive' && reason) {
          updateData.rejection_reason = reason
        }
        
        const { data, error } = await supabase.from('properties').update(updateData).eq('id', id).select().single()
        if (error) throw error
        return data
      },

      deleteProperty: async (id) => {
        const { error } = await supabase.from('properties').delete().eq('id', id)
        if (error) throw error
      },

      // ── Rooms ───────────────────────────────────────────────────────────────
      fetchRooms: async (propertyId) => {
        let query = supabase.from('rooms').select('*').order('room_number', { ascending: true })
        if (propertyId) query = query.eq('property_id', propertyId)
        const { data, error } = await query
        if (error) throw error
        return data || []
      },

      syncPropertyRooms: async (propertyId) => {
        const { data: rooms } = await supabase.from('rooms').select('is_available').eq('property_id', propertyId)
        if (rooms) {
          const total = rooms.length
          const avail = rooms.filter(r => r.is_available).length
          await supabase.from('properties').update({ total_rooms: total, available_rooms: avail }).eq('id', propertyId)
        }
      },

      createRoom: async (roomData) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const { data, error } = await supabase.from('rooms').insert({
          property_id: roomData.property_id,
          owner_id: user.id,
          room_number: roomData.room_number,
          floor: roomData.floor || 1,
          price_monthly: roomData.price_monthly,
          price_daily: roomData.price_daily || null,
          amenities: roomData.amenities || [],
          is_available: roomData.is_available !== undefined ? roomData.is_available : true,
          notes: roomData.notes || null,
          image_urls: roomData.image_urls || [],
          image_url: (roomData.image_urls && roomData.image_urls.length > 0) ? roomData.image_urls[0] : null,
        }).select().single()
        if (error) {
          console.error('createRoom Supabase error:', JSON.stringify(error, null, 2))
          throw error
        }
        if (data) await get().syncPropertyRooms(data.property_id)
        return data
      },

      uploadRoomImages: async (files, roomId) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const uploadPromises = files.map(async (file, idx) => {
          const ext = file.name.split('.').pop()
          const path = `${user.id}/rooms/${roomId || 'new'}_${Date.now()}_${idx}.${ext}`
          const { data, error } = await supabase.storage
            .from('property-images')
            .upload(path, file, { upsert: true, contentType: file.type })
          if (error) throw error
          const { data: urlData } = supabase.storage
            .from('property-images')
            .getPublicUrl(data.path)
          return urlData.publicUrl
        })
        return Promise.all(uploadPromises)
      },

      updateRoom: async (id, updates) => {
        const { data, error } = await supabase.from('rooms').update(updates).eq('id', id).select()
        if (error) {
          console.error('updateRoom Supabase error:', JSON.stringify(error, null, 2))
          throw error
        }
        if (!data || data.length === 0) {
          throw new Error('Room could not be updated. This usually means the room does not exist, or you are not recognized as its owner by the database security rules.')
        }
        await get().syncPropertyRooms(data[0].property_id)
        return data[0]
      },

      deleteRoom: async (id) => {
        // SAFETY CHECK: Prevent deletion if there are active or pending reservations
        const { data: activeReservations } = await supabase
          .from('reservations')
          .select('id, status')
          .eq('room_id', id)
          .in('status', ['pending', 'awaiting_payment', 'confirmed'])
        
        if (activeReservations && activeReservations.length > 0) {
          throw new Error('Cannot delete room: It is currently assigned to an active or pending tenant reservation.')
        }

        const { data: room } = await supabase.from('rooms').select('property_id').eq('id', id).single()
        const { error } = await supabase.from('rooms').delete().eq('id', id)
        if (error) {
          console.error('deleteRoom Supabase error:', JSON.stringify(error, null, 2))
          throw error
        }
        if (room) await get().syncPropertyRooms(room.property_id)
      },

      // ── Reservations ───────────────────────────────────────────────────────
      fetchReservations: async (filters = {}) => {
        let query = supabase.from('reservations').select('*').order('created_at', { ascending: false })
        if (filters.tenantId) query = query.eq('tenant_id', filters.tenantId)
        if (filters.propertyId) query = query.eq('property_id', filters.propertyId)
        if (filters.status) query = query.eq('status', filters.status)
        const { data, error } = await query
        if (error) throw error
        
        if (!data || data.length === 0) return []

        const tenantIds = [...new Set(data.map(r => r.tenant_id).filter(Boolean))]
        const propertyIds = [...new Set(data.map(r => r.property_id).filter(Boolean))]

        let profilesDataMap = {}
        if (tenantIds.length > 0) {
          const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url, email, contact, municipality').in('id', tenantIds)
          ;(profiles || []).forEach(p => profilesDataMap[p.id] = p)
        }

        let propertiesMap = {}
        if (propertyIds.length > 0) {
          const { data: properties } = await supabase.from('properties').select('id, name').in('id', propertyIds)
          ;(properties || []).forEach(p => propertiesMap[p.id] = p.name)
        }

        return data.map(r => {
          const p = profilesDataMap[r.tenant_id] || {}
          return {
            ...r,
            tenant_name: p.full_name || 'Unknown Tenant',
            tenant_avatar: p.avatar_url || null,
            tenant_email: p.email || null,
            tenant_contact: p.contact || null,
            tenant_municipality: p.municipality || null,
            property_name: propertiesMap[r.property_id] || 'Unknown Property'
          }
        })
      },

      createReservation: async (reservationData) => {
        const sessionUser = (await supabase.auth.getSession()).data.session?.user
        const userId = sessionUser?.id || get().user?.id
        if (!userId) throw new Error('Not authenticated')

        // 1. Fetch user's current active reservations
        const { data: activeRes, error: fetchErr } = await supabase.from('reservations')
          .select('room_id')
          .eq('tenant_id', userId)
          .in('status', ['pending', 'awaiting_payment', 'confirmed'])
        
        if (fetchErr) throw fetchErr

        // 2. Check duplicate room reservation
        if (activeRes.some(r => r.room_id === reservationData.room_id)) {
           throw new Error('You already have an active reservation for this room.')
        }

        // 3. Check max 3 reservations limit
        if (activeRes.length >= 3) {
           throw new Error('You have reached the maximum limit of 3 active reservations. Please cancel one before reserving again.')
        }

        const { data, error } = await supabase.from('reservations').insert({
          tenant_id: userId,
          owner_id: reservationData.owner_id || null,
          property_id: reservationData.property_id,
          room_id: reservationData.room_id || null,
          check_in: reservationData.check_in,
          check_out: reservationData.check_out || null,
          duration_months: reservationData.duration_months || 1,
          amount_total: reservationData.amount_total,
          stay_type: reservationData.stay_type || 'long_term',
          status: 'pending',
          notes: reservationData.notes || null,
        }).select().single()
        if (error) throw error
        return data
      },

      updateReservationStatus: async (id, status) => {
        if (get().isTenant() && status === 'cancelled') {
          const { data: rData } = await supabase.from('reservations').select('property_id').eq('id', id).single()
          const { error } = await supabase.rpc('tenant_cancel_reservation', { res_id: id })
          if (error) throw error
          if (rData?.property_id) await get().syncPropertyRooms(rData.property_id)
          return
        }

        const updateData = { status }
        if (status === 'completed') {
          updateData.ended_at = new Date().toISOString()
        }
        const { data, error } = await supabase.from('reservations').update(updateData).eq('id', id).select().single()
        if (error) throw error
        
        // --- AUTO-INJECT INITIAL PAYMENT ---
        if (status === 'confirmed') {
          // Check if a transaction for initial deposit already exists to prevent duplicates
          const { data: existingTx } = await supabase.from('transactions')
            .select('id')
            .eq('reservation_id', id)
            .eq('payment_type', 'initial_deposit')
            .limit(1)

          if (!existingTx || existingTx.length === 0) {
            // Create a verified transaction automatically
            const { error: txErr } = await supabase.from('transactions').insert({
              reservation_id: id,
              tenant_id: data.tenant_id,
              owner_id: data.owner_id,
              property_id: data.property_id,
              amount: data.amount_total,
              payment_type: 'initial_deposit',
              payment_date: new Date().toISOString().split('T')[0],
              receipt_url: data.payment_receipt_url || null,
              status: 'verified'
            })
            if (txErr) console.error("Failed to auto-inject transaction:", txErr)
          }
        }
        // -----------------------------------

        if (data.room_id) {
          const isAvailable = !['confirmed', 'awaiting_payment'].includes(status);
          const roomStatus = status === 'confirmed' ? 'occupied' : (status === 'awaiting_payment' ? 'ongoing_transaction' : 'available');
          const { error: roomErr } = await supabase.from('rooms').update({ is_available: isAvailable, status: roomStatus }).eq('id', data.room_id)
          if (roomErr) throw roomErr;
          await get().syncPropertyRooms(data.property_id)
        }
        
        return data
      },

      deleteReservation: async (id) => {
        const { data: res } = await supabase.from('reservations').select('room_id, property_id').eq('id', id).single()
        const { error } = await supabase.from('reservations').delete().eq('id', id)
        if (error) throw error
        
        if (res?.room_id) {
          await supabase.from('rooms').update({ is_available: true, status: 'available' }).eq('id', res.room_id)
          await get().syncPropertyRooms(res.property_id)
        }
      },

      uploadPaymentReceipt: async (file, reservationId) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${reservationId}_receipt_${Date.now()}.${ext}`
        
        const { data, error } = await supabase.storage
          .from('payment-receipts')
          .upload(path, file, { upsert: true, contentType: file.type })
          
        if (error) throw error
        
        const { data: urlData } = supabase.storage
          .from('payment-receipts')
          .getPublicUrl(data.path)
          
        // Update the reservation with the receipt URL
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ payment_receipt_url: urlData.publicUrl })
          .eq('id', reservationId)
          
        if (updateError) throw updateError
        
        return urlData.publicUrl
      },

      uploadContract: async (file, reservationId) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        
        const ext = file.name.split('.').pop()
        const path = `${user.id}/${reservationId}_contract_${Date.now()}.${ext}`
        
        const { data, error } = await supabase.storage
          .from('contracts')
          .upload(path, file, { upsert: true, contentType: file.type })
          
        if (error) throw error
        
        const { data: urlData } = supabase.storage
          .from('contracts')
          .getPublicUrl(data.path)
          
        // Update the reservation with the contract URL
        const { error: updateError } = await supabase
          .from('reservations')
          .update({ contract_url: urlData.publicUrl })
          .eq('id', reservationId)
          
        if (updateError) throw updateError
        
        return urlData.publicUrl
      },

      // ── Transactions ───────────────────────────────────────────────────────
      fetchTransactions: async () => {
        let query = supabase.from('transactions').select(`
          *,
          reservation:reservations(status, room_id, rooms(room_number)),
          property:properties(name, address, municipality),
          tenant:profiles!tenant_id(full_name),
          owner:profiles!owner_id(full_name)
        `).order('payment_date', { ascending: false })
        
        const { data, error } = await query
        if (error) throw error
        return data || []
      },

      createTransaction: async (txData) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        
        const { data, error } = await supabase.from('transactions').insert({
          reservation_id: txData.reservation_id,
          tenant_id: user.id,
          owner_id: txData.owner_id,
          property_id: txData.property_id,
          amount: txData.amount,
          payment_type: txData.payment_type,
          payment_date: txData.payment_date,
          receipt_url: txData.receipt_url,
          status: 'pending_verification'
        }).select().single()
        
        if (error) throw error
        return data
      },

      updateTransactionStatus: async (id, status) => {
        const { data, error } = await supabase.from('transactions').update({ status }).eq('id', id).select().single()
        if (error) throw error
        return data
      },

      updateTransaction: async (id, updates) => {
        const { data, error } = await supabase.from('transactions').update(updates).eq('id', id).select().single()
        if (error) throw error
        return data
      },

      deleteTransaction: async (id) => {
        const { error } = await supabase.from('transactions').delete().eq('id', id)
        if (error) throw error
        return true
      },

      uploadTransactionReceipt: async (file) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        
        const ext = file.name.split('.').pop()
        const path = `${user.id}/tx_${Date.now()}.${ext}`
        
        const { data, error } = await supabase.storage
          .from('payment-receipts')
          .upload(path, file, { upsert: true, contentType: file.type })
          
        if (error) throw error
        
        const { data: urlData } = supabase.storage
          .from('payment-receipts')
          .getPublicUrl(data.path)
          
        return urlData.publicUrl
      },

      // ── Reviews ────────────────────────────────────────────────────────────
      fetchReviews: async (propertyId) => {
        let query = supabase.from('reviews').select('*').order('created_at', { ascending: false })
        if (propertyId && propertyId !== 'all') {
          query = query.eq('property_id', propertyId)
        }
        const { data, error } = await query
        if (error) throw error

        if (!data || data.length === 0) return []

        const tenantIds = [...new Set(data.map(r => r.tenant_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url')
          .in('id', tenantIds)
        
        const profileMap = {}
        ;(profiles || []).forEach(p => profileMap[p.id] = p)

        return data.map(r => ({
          ...r,
          reviewer: profileMap[r.tenant_id] || null
        }))
      },

      backfillMissingPayments: async () => {
        const user = get().user
        if (!user) return

        // Get all confirmed reservations for this owner
        const { data: res } = await supabase.from('reservations')
          .select('*')
          .eq('owner_id', user.id)
          .in('status', ['confirmed', 'completed'])

        if (!res) return

        for (let r of res) {
          // Check if there is already an initial deposit
          const { data: txs } = await supabase.from('transactions')
            .select('id')
            .eq('reservation_id', r.id)
            .eq('payment_type', 'initial_deposit')

          if (!txs || txs.length === 0) {
            // Insert missing transaction
            await supabase.from('transactions').insert({
              reservation_id: r.id,
              tenant_id: r.tenant_id,
              owner_id: r.owner_id,
              property_id: r.property_id,
              amount: r.amount_total,
              payment_type: 'initial_deposit',
              payment_date: new Date().toISOString().split('T')[0],
              receipt_url: r.payment_receipt_url || null,
              status: 'verified'
            })
          }
        }
      },

      createReview: async (reviewData) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const { data, error } = await supabase.from('reviews').insert({
          tenant_id: user.id,
          property_id: reviewData.property_id,
          rating: reviewData.rating,
          cleanliness: reviewData.cleanliness || null,
          location_score: reviewData.location_score || null,
          value: reviewData.value || null,
          safety: reviewData.safety || null,
          text: reviewData.text || null,
        }).select().single()
        if (error) throw error
        return data
      },

      // ── Tenants (admin view) ────────────────────────────────────────────────
      fetchTenants: async () => {
        const { data, error } = await supabase.from('profiles').select('*').eq('role', 'tenant').order('created_at', { ascending: false })
        if (error) throw new Error('Profile update failed: ' + error.message)
        return data || []
      },

      // ── All Users (admin view) ─────────────────────────────────────────────
      fetchAllUsers: async () => {
        const { data, error } = await supabase.from('profiles').select('*').in('role', ['tenant', 'owner']).order('created_at', { ascending: false })
        if (error) throw new Error('Failed to fetch users: ' + error.message)
        return data || []
      },

      // ── Update User Status (Admin) ───────────────────────────────────────
      updateUserStatus: async (userId, status) => {
        const { error } = await supabase
          .from('profiles')
          .update({ status })
          .eq('id', userId)

        if (error) throw new Error('Failed to update user status: ' + error.message)
      },

      // ── Stats ──────────────────────────────────────────────────────────────
      fetchStats: async () => {
        const [props, reservations, reviews, tenants] = await Promise.all([
          supabase.from('properties').select('id, status, total_rooms, available_rooms, occupancy_rate, price_monthly'),
          supabase.from('reservations').select('id, status'),
          supabase.from('reviews').select('id, property_id'),
          supabase.from('profiles').select('id, role, created_at').eq('role', 'tenant'),
        ])
        const propList = props.data || []
        const resList = reservations.data || []
        const reviewList = reviews.data || []
        const tenantList = tenants.data || []
        const totalListings = propList.length
        const avgOccupancy = totalListings > 0 ? Math.round(propList.reduce((a, p) => a + (p.occupancy_rate || 0), 0) / totalListings) : 0
        return {
          total_listings: totalListings,
          active_tenants: tenantList.length,
          pending_reservations: resList.filter(r => r.status === 'pending').length,
          avg_occupancy: avgOccupancy,
          pending_properties: propList.filter(p => p.status === 'pending_review').length,
          total_reviews: reviewList.length,
        }
      },

      fetchMyLandlord: async (tenantId) => {
        // Handle demo account fallback
        if (tenantId === 'demo-tenant-001') {
          return {
            landlord: {
              full_name: 'Lola Fina Maravilla',
              email: 'owner@smartstay.ph',
              contact: '+63 912 345 6789',
              municipality: 'Basco',
              role: 'owner',
              avatar_url: null,
            },
            property: {
              name: 'Casa Ivatan Bed & Board',
              address: 'Naidi Hills, Basco, Batanes',
              municipality: 'Basco',
              island: 'Batan',
              price_monthly: 3500,
            },
            reservation: {
              status: 'confirmed',
              check_in: '2026-06-01',
              duration_months: 6,
              amount_total: 21000,
            }
          }
        }

        // 1. Get the most recent active reservation
        const { data: reservations, error: resError } = await supabase
          .from('reservations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })

        if (resError) {
          console.log('[fetchMyLandlord] resError:', resError);
          throw resError;
        }
        if (!reservations || reservations.length === 0) {
          console.log('[fetchMyLandlord] no reservations found for tenant', tenantId);
          return null
        }

        const resObj = reservations[0]
        console.log('[fetchMyLandlord] found reservation:', resObj);
        // 2. Get the property details
        const { data: property, error: propError } = await supabase
          .from('properties')
          .select('*')
          .eq('id', resObj.property_id)
          .single()

        if (propError) throw propError
        if (!property) return null

        // 3. Get the owner's profile
        const { data: profile, error: profError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', property.owner_id)
          .single()

        if (profError) throw profError

        return {
          landlord: profile,
          property: property,
          reservation: resObj
        }
      },

      fetchMyRoom: async (tenantId) => {
        if (tenantId === 'demo-tenant-001') {
          return {
            room: {
              room_number: '101',
              floor: 1,
              price_monthly: 3500,
              amenities: ['WiFi', 'Water', 'Electric'],
              is_available: true,
              notes: 'Corner room with window view.',
            },
            property: {
              name: 'Casa Ivatan Bed & Board',
              address: 'Naidi Hills, Basco, Batanes',
              municipality: 'Basco',
              island: 'Batan',
              price_monthly: 3500,
            },
            reservation: {
              status: 'confirmed',
              check_in: '2026-06-01',
              duration_months: 6,
              amount_total: 21000,
            }
          }
        }

        const { data: reservations, error: resError } = await supabase
          .from('reservations')
          .select('*')
          .eq('tenant_id', tenantId)
          .eq('status', 'confirmed')
          .order('created_at', { ascending: false })

        if (resError) throw resError
        if (!reservations || reservations.length === 0) return null

        const resObj = reservations[0]

        const { data: property, error: propError } = await supabase
          .from('properties')
          .select('*, owner:profiles!properties_owner_id_fkey(full_name)')
          .eq('id', resObj.property_id)
          .single()

        if (propError) throw propError
        if (!property) return null

        let room = null
        if (resObj.room_id) {
          const { data: roomData, error: roomError } = await supabase
            .from('rooms')
            .select('*')
            .eq('id', resObj.room_id)
            .single()

          if (!roomError && roomData) room = roomData
        }

        return {
          room: room,
          property: property,
          reservation: resObj
        }
      },

      // ── Messaging ──────────────────────────────────────────────────────────
      fetchConversations: async () => {
        const user = get().user
        if (!user) return []

        // Fetch all messages where this user is sender or receiver
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .order('created_at', { ascending: false })

        if (error) { console.error('fetchConversations error:', error); return [] }
        if (!msgs || msgs.length === 0) return []

        // Get unique IDs of the OTHER person in each message
        const otherIds = [...new Set(msgs.map((m) =>
          m.sender_id === user.id ? m.receiver_id : m.sender_id
        ))]

        // Fetch profiles for those IDs
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .in('id', otherIds)
        const profileMap = {}
        ;(profiles || []).forEach((p) => { profileMap[p.id] = p })

        // Group into one conversation object per other person
        const convMap = {}
        msgs.forEach((m) => {
          const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id
          if (!convMap[otherId]) {
            convMap[otherId] = {
              otherId,
              otherProfile: profileMap[otherId] || null,
              latestMessage: m,
              unreadCount: 0,
            }
          }
          if (m.receiver_id === user.id && !m.is_read) {
            convMap[otherId].unreadCount++
          }
        })

        return Object.values(convMap).sort(
          (a, b) => new Date(b.latestMessage.created_at) - new Date(a.latestMessage.created_at)
        )
      },

      sendMessage: async ({ owner_id, property_id, body }) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        const { data, error } = await supabase.from('messages').insert({
          sender_id: user.id,
          receiver_id: owner_id,
          property_id: property_id || null,
          body: body.trim(),
          is_read: false,
        }).select().single()
        if (error) throw error
        return data
      },

      fetchNotifications: async () => {
        const user = get().user
        if (!user) return []
        // Step 1: fetch raw messages
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .eq('receiver_id', user.id)
          .order('created_at', { ascending: false })
          .limit(20)
        if (error) {
          console.error('fetchNotifications error:', error)
          return []
        }
        if (!msgs || msgs.length === 0) return []

        // Step 2: fetch sender names from public.profiles
        const senderIds = [...new Set(msgs.map((m) => m.sender_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name, role, avatar_url')
          .in('id', senderIds)
        const profileMap = {}
        ;(profiles || []).forEach((p) => { profileMap[p.id] = p })

        // Merge
        return msgs.map((m) => ({ ...m, sender: profileMap[m.sender_id] || null }))
      },

      markNotificationRead: async (id) => {
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('id', id)
        if (error) console.error('markNotificationRead error:', error)
      },

      markAllNotificationsRead: async () => {
        const user = get().user
        if (!user) return
        const { error } = await supabase
          .from('messages')
          .update({ is_read: true })
          .eq('receiver_id', user.id)
          .eq('is_read', false)
        if (error) console.error('markAllNotificationsRead error:', error)
      },

      fetchMessages: async (otherUserId) => {
        const user = get().user
        if (!user) return []
        // Step 1: fetch thread
        const { data: msgs, error } = await supabase
          .from('messages')
          .select('*')
          .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
          .order('created_at', { ascending: true })
        if (error) {
          console.error('fetchMessages error:', error)
          return []
        }
        if (!msgs || msgs.length === 0) return []

        // Step 2: fetch sender names
        const senderIds = [...new Set(msgs.map((m) => m.sender_id))]
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', senderIds)
        const profileMap = {}
        ;(profiles || []).forEach((p) => { profileMap[p.id] = p })

        return msgs.map((m) => ({ ...m, sender: profileMap[m.sender_id] || null }))
      },

      fetchUserReviews: async (userId) => {
        const { data, error } = await supabase
          .from('user_reviews')
          .select('*, reviewer:profiles!reviewer_id(full_name, avatar_url, role)')
          .eq('reviewee_id', userId)
          .order('created_at', { ascending: false })
        
        if (error) {
          console.error('fetchUserReviews error:', error)
          return []
        }
        return data || []
      },

      submitReview: async (payload) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        
        const { error } = await supabase
          .from('user_reviews')
          .insert({
            reviewer_id: user.id,
            reviewee_id: payload.reviewee_id,
            reservation_id: payload.reservation_id || null,
            rating: payload.rating,
            categories: payload.categories || {},
            comment: payload.comment || ''
          })
          
        if (error) throw new Error('Failed to submit review: ' + error.message)
        
        // Update average rating and trust score
        try {
          const { data: revs } = await supabase.from('user_reviews').select('rating').eq('reviewee_id', payload.reviewee_id)
          if (revs && revs.length > 0) {
            const totalRev = revs.length
            const avgRating = Number((revs.reduce((acc, r) => acc + r.rating, 0) / totalRev).toFixed(1))
            const newTrustScore = Math.min(100, Math.max(0, Math.round(50 + (totalRev * 2) + ((avgRating - 3) * 5))))
            
            await supabase.from('profiles').update({
              total_reviews: totalRev,
              average_rating: avgRating,
              trust_score: newTrustScore
            }).eq('id', payload.reviewee_id)
          }
        } catch (e) {
          console.error('Failed to update stats:', e)
        }
        
        return true
      },

      // ==================== COMPLAINTS ====================

      submitComplaint: async (payload) => {
        const user = get().user
        if (!user?.id) throw new Error('Not authenticated')

        // Auto-determine island from property if not provided
        let island = payload.island || null
        if (!island && payload.property_id) {
          const { data: prop } = await supabase.from('properties').select('island').eq('id', payload.property_id).single()
          if (prop?.island) island = prop.island
        }

        const { data, error } = await supabase.from('complaints').insert({
          reporter_id: user.id,
          accused_id: payload.accused_id || null,
          reservation_id: payload.reservation_id || null,
          property_id: payload.property_id || null,
          island,
          type: payload.type,
          subject: payload.subject,
          description: payload.description,
          status: 'open',
        }).select().single()

        if (error) throw new Error('Failed to submit complaint: ' + error.message)
        return data
      },

      fetchComplaints: async (filters = {}) => {
        const user = get().user
        let query = supabase.from('complaints')
          .select(`
            *,
            reporter:profiles!complaints_reporter_id_fkey(id, full_name, email, role, municipality, avatar_url),
            accused:profiles!complaints_accused_id_fkey(id, full_name, email, role, municipality, avatar_url),
            resolved_by_profile:profiles!complaints_resolved_by_fkey(id, full_name)
          `)
          .order('created_at', { ascending: false })

        // Island admins can only see their island's complaints
        if (user?.role === 'admin' && user?.admin_region) {
          // Derive island from admin_region (e.g. 'Batan Island' -> 'Batan')
          const island = user.admin_region.replace(' Island', '')
          query = query.eq('island', island)
        }

        if (filters.status) query = query.eq('status', filters.status)
        if (filters.type) query = query.eq('type', filters.type)

        const { data, error } = await query
        if (error) throw error
        return data || []
      },

      updateComplaintStatus: async (id, status, adminNotes = null) => {
        const user = get().user
        const updateData = { status }
        if (adminNotes !== null) updateData.admin_notes = adminNotes
        if (status === 'resolved' || status === 'escalated') {
          updateData.resolved_by = user?.id || null
        }

        const { data, error } = await supabase.from('complaints').update(updateData).eq('id', id).select().single()
        if (error) throw new Error('Failed to update complaint: ' + error.message)
        return data
      },
    }),

    {
      name: 'smartstay-auth',
      partialize: (s) => ({ user: s.user }),
    }
  )
)