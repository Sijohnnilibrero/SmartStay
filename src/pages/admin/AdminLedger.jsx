import { useState, useEffect } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { Eye, ShieldAlert } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import NotificationBell from '@/components/layout/NotificationBell'

export default function AdminLedger() {
  const { fetchTransactions, updateTransactionStatus } = useAuthStore()
  const { addToast, systemConfirm } = useAppStore()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewImageUrl, setViewImageUrl] = useState(null)
  const [actioningId, setActioningId] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetchTransactions().then(txs => {
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

  return (
    <>
      <div className="page-enter w-full max-w-full space-y-6 px-4 sm:px-6 pt-5 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-stone-800">Master Ledger</h1>
            <p className="text-sm text-stone-500 mt-1">Global view of all platform transactions for auditing.</p>
          </div>
          <NotificationBell />
        </div>

      <Card className="w-full overflow-hidden border border-stone-200">
        <div className="w-full overflow-x-auto pb-2">
          <table className="w-full text-left border-collapse min-w-[1000px]">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200">
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
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="7" className="px-4 py-8 text-center text-stone-400 text-sm">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm text-stone-800 font-medium">
                    {new Date(tx.payment_date).toLocaleDateString()}
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
      {viewImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm" onClick={() => setViewImageUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button className="absolute -top-10 right-0 text-white hover:text-stone-300 font-bold" onClick={() => setViewImageUrl(null)}>
              Close
            </button>
            <img src={viewImageUrl} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </>
  )
}
