import { useState, useEffect } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { Eye, ShieldAlert } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import NotificationBell from '@/components/layout/NotificationBell'
import ImageViewerModal from '@/components/ui/ImageViewerModal'

export default function AdminLedger() {
  const { user, fetchTransactions, updateTransactionStatus } = useAuthStore()
  const { addToast, systemConfirm } = useAppStore()
  const [transactions, setTransactions] = useState([])
  const [regionFilter, setRegionFilter] = useState('All')
  const [loading, setLoading] = useState(true)
  const [viewImageUrl, setViewImageUrl] = useState(null)
  const [actioningId, setActioningId] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetchTransactions().then(txs => {
      console.log('RAW FETCHED TRANSACTIONS:', txs)
      setTransactions(txs)
    }).catch(err => {
      console.error('FETCH ERROR:', err)
      addToast(`Failed to load transactions: ${err.message || err.details || JSON.stringify(err)}`, 'error')
    }).finally(() => {
      setLoading(false)
    })
  }

  // Silent refresh — no loading spinner, data just swaps in
  const refreshData = () => {
    fetchTransactions().then(txs => {
      setTransactions(txs)
    }).catch(err => console.error('Silent refresh error:', err))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime: silently update when transactions change
  useEffect(() => {
    const channel = supabase
      .channel('admin-ledger-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        refreshData()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const handleStatusChange = async (id, status) => {
    const confirmed = await systemConfirm(
      `Are you sure you want to FORCE mark this transaction as ${status}? This should only be used to resolve disputes.`
    )
    if (!confirmed) return

    setActioningId(id)
    try {
      await updateTransactionStatus(id, status)
      addToast(`Payment force-marked as ${status}`, 'success')
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    } catch (err) {
      console.error(err)
      addToast('Failed to update status', 'error')
    } finally {
      setActioningId(null)
    }
  }

  if (loading) return <div className="p-12 text-center text-stone-400">Loading master ledger...</div>

  // Filter transactions based on admin role and region selection
  const filteredTransactions = transactions.filter(tx => {
    const propMunicipality = tx.property?.municipality || ''
    
    // Regular admin: forcefully filter to their region only
    if (user?.role === 'admin' && user?.admin_region) {
      if (user.admin_region === 'Batan Island') {
        const batanMunis = ['Basco', 'Mahatao', 'Ivana', 'Uyugan']
        if (!batanMunis.includes(propMunicipality)) return false
      } else {
        if (propMunicipality !== user.admin_region) return false
      }
    }
    
    // Super admin: filter manually if selected
    if (user?.role === 'super_admin' && regionFilter !== 'All') {
      if (regionFilter === 'Batan Island') {
        const batanMunis = ['Basco', 'Mahatao', 'Ivana', 'Uyugan']
        if (!batanMunis.includes(propMunicipality)) return false
      } else {
        if (propMunicipality !== regionFilter) return false
      }
    }
    
    return true
  })

  return (
    <>
      <div className="page-enter w-full max-w-full flex flex-col h-[calc(100vh-80px)] space-y-4 px-4 sm:px-6 pt-5 pb-6">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 shrink-0">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-stone-800">
              {user?.role === 'super_admin' ? 'Global System Ledger' : `${user?.admin_region} Territory Ledger`}
            </h1>
            <p className="text-sm text-stone-500 mt-1">
              {user?.role === 'super_admin' ? 'Global view of all platform transactions for auditing.' : `View all transactions for properties in ${user?.admin_region}.`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user?.role === 'super_admin' && (
              <select
                value={regionFilter}
                onChange={(e) => setRegionFilter(e.target.value)}
                className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-700 font-medium focus:ring-2 focus:ring-stone-900 focus:border-stone-900 outline-none shadow-sm cursor-pointer"
              >
                <option value="All">🌍 All Regions</option>
                <option value="Batan Island">🏝️ Batan Island</option>
                <option value="Sabtang">🏝️ Sabtang Island</option>
                <option value="Itbayat">🏝️ Itbayat Island</option>
              </select>
            )}
            <NotificationBell />
          </div>
        </div>

      <Card className="w-full flex-1 flex flex-col min-h-0 border border-stone-200 p-0 overflow-hidden">
        <div className="w-full flex-1 overflow-auto bg-white">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead className="sticky top-0 z-20 bg-stone-100 shadow-sm ring-1 ring-stone-200">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Owner</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Admin Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-stone-400 text-sm">
                    No transactions found for this region.
                  </td>
                </tr>
              )}
              {filteredTransactions.map(tx => (
                <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm text-stone-800 font-medium">
                    <div className="flex flex-col">
                      <span>{new Date(tx.created_at || tx.payment_date).toLocaleDateString()}</span>
                      <span className="text-[10px] text-stone-400">{new Date(tx.created_at || tx.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-800">
                    {tx.tenant?.full_name || 'Unknown'}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-800">
                    {tx.owner?.full_name || 'Unknown'}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-stone-800">{tx.property?.name}</p>
                    <p className="text-[10px] text-stone-500 uppercase">{tx.payment_type.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-stone-800">₱{tx.amount.toLocaleString()}</p>
                  </td>
                  <td className="px-4 py-4">
                     <Badge variant={tx.status === 'verified' ? 'teal' : tx.status === 'pending_verification' ? 'amber' : 'coral'} className="uppercase text-[10px] mb-1 block w-fit">
                        {tx.status}
                     </Badge>
                     {tx.receipt_url ? (
                      <button onClick={() => setViewImageUrl(tx.receipt_url)} className="inline-flex items-center text-xs font-medium text-[--teal] hover:text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100 transition-colors">
                        <Eye size={14} className="mr-1.5" /> View Proof
                      </button>
                    ) : null}
                  </td>
                  <td className="px-4 py-4 text-right">
                     <div className="flex justify-end gap-1">
                        {tx.status !== 'verified' && (
                          <Button size="sm" variant="ghost" className="text-xs text-teal-600 hover:bg-teal-50" disabled={actioningId === tx.id} onClick={() => handleStatusChange(tx.id, 'verified')}>Force Verify</Button>
                        )}
                        {tx.status !== 'rejected' && (
                          <Button size="sm" variant="ghost" className="text-xs text-red-600 hover:bg-red-50" disabled={actioningId === tx.id} onClick={() => handleStatusChange(tx.id, 'rejected')}>Force Reject</Button>
                        )}
                     </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      </div>

      {/* Image View Modal */}
      <ImageViewerModal
        isOpen={!!viewImageUrl}
        imageUrl={viewImageUrl}
        onClose={() => setViewImageUrl(null)}
      />
    </>
  )
}
