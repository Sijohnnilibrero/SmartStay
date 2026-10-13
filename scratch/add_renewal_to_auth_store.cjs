const fs = require('fs');

const filePath = 'c:\\Users\\Administrator\\Desktop\\SmartStay_yudanay_system_ba\\smartstay-vite\\smartstay\\src\\store\\useAuthStore.js';
let content = fs.readFileSync(filePath, 'utf8');

const renewalMethods = `
      requestLeaseRenewal: async (reservationId, months, notes) => {
        const user = get().user
        if (!user) throw new Error('Not authenticated')
        
        const { data: res, error: fetchErr } = await supabase.from('reservations').select('*').eq('id', reservationId).single()
        if (fetchErr || !res) throw new Error('Reservation not found')

        const cleanNotes = (res.notes || '').replace(/\\[RENEWAL:.*?\\]/g, '').trim()
        const renewalTag = '[RENEWAL:' + JSON.stringify({
          status: 'pending',
          months: months,
          notes: notes || '',
          date: new Date().toISOString()
        }) + ']'
        const updatedNotes = cleanNotes ? cleanNotes + ' | ' + renewalTag : renewalTag

        let updatedData = null
        try {
          const { data, error } = await supabase.from('reservations').update({
            renewal_status: 'pending',
            renewal_months: months,
            renewal_notes: notes || '',
            renewal_requested_at: new Date().toISOString(),
            notes: updatedNotes
          }).eq('id', reservationId).select().single()
          if (error) throw error
          updatedData = data
        } catch (colErr) {
          // Fallback if columns don't exist yet
          const { data, error } = await supabase.from('reservations').update({
            notes: updatedNotes
          }).eq('id', reservationId).select().single()
          if (error) throw error
          updatedData = data
        }

        // Notify landlord
        if (res.owner_id) {
          try {
            await supabase.from('app_notifications').insert({
              user_id: res.owner_id,
              title: 'Lease Extension Request',
              body: (user.full_name || 'Your tenant') + ' requested a ' + months + '-month lease extension.',
              type: 'reservation_renewal',
            })
          } catch (notifErr) {
            console.warn('Renewal notification failed:', notifErr)
          }
        }

        return updatedData
      },

      respondLeaseRenewal: async (reservationId, approve = true, rejectionReason = '') => {
        const { data: res, error: fetchErr } = await supabase.from('reservations').select('*').eq('id', reservationId).single()
        if (fetchErr || !res) throw new Error('Reservation not found')

        // Parse renewal data
        let renewalMonths = res.renewal_months || 0
        if (!renewalMonths && res.notes && res.notes.includes('[RENEWAL:')) {
          try {
            const match = res.notes.match(/\\[RENEWAL:({.*?})\\]/)
            if (match && match[1]) {
              const parsed = JSON.parse(match[1])
              renewalMonths = parsed.months || 0
            }
          } catch (e) {}
        }
        if (!renewalMonths) renewalMonths = 1

        const cleanNotes = (res.notes || '').replace(/\\[RENEWAL:.*?\\]/g, '').trim()
        let updatePayload = {}

        if (approve) {
          const currentMonths = res.duration_months || 1
          const newMonths = currentMonths + renewalMonths
          const monthlyRent = res.amount_total ? (res.amount_total / currentMonths) : 0
          const newAmountTotal = res.amount_total + (monthlyRent * renewalMonths)

          let newCheckOut = res.check_out
          if (res.check_in) {
            const d = new Date(res.check_in)
            d.setMonth(d.getMonth() + newMonths)
            newCheckOut = d.toISOString().split('T')[0]
          }

          updatePayload = {
            duration_months: newMonths,
            amount_total: newAmountTotal,
            check_out: newCheckOut,
            renewal_status: 'approved',
            notes: cleanNotes ? cleanNotes + ' | [Lease Extended: +' + renewalMonths + ' mos]' : '[Lease Extended: +' + renewalMonths + ' mos]'
          }
        } else {
          updatePayload = {
            renewal_status: 'declined',
            notes: cleanNotes ? cleanNotes + ' | [Renewal Request Declined' + (rejectionReason ? ': ' + rejectionReason : '') + ']' : '[Renewal Request Declined]'
          }
        }

        let updatedData = null
        try {
          const { data, error } = await supabase.from('reservations').update(updatePayload).eq('id', reservationId).select().single()
          if (error) throw error
          updatedData = data
        } catch (colErr) {
          // Fallback if renewal_status column doesn't exist
          delete updatePayload.renewal_status
          const { data, error } = await supabase.from('reservations').update(updatePayload).eq('id', reservationId).select().single()
          if (error) throw error
          updatedData = data
        }

        // Notify tenant
        if (res.tenant_id) {
          try {
            await supabase.from('app_notifications').insert({
              user_id: res.tenant_id,
              title: approve ? 'Lease Extension Approved 🎉' : 'Lease Extension Declined',
              body: approve 
                ? 'Your landlord approved your ' + renewalMonths + '-month lease extension! Your contract has been extended.'
                : 'Your landlord declined your lease extension request' + (rejectionReason ? ': ' + rejectionReason : '.'),
              type: 'reservation_renewal',
            })
          } catch (notifErr) {
            console.warn('Notification failed:', notifErr)
          }
        }

        return updatedData
      },
`;

const anchor = "      deleteReservation: async (id) => {";
if (!content.includes("requestLeaseRenewal: async (reservationId, months, notes) => {")) {
  content = content.replace(anchor, renewalMethods + '\n' + anchor);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('Successfully added renewal methods to useAuthStore.js!');
} else {
  console.log('Renewal methods already present.');
}
