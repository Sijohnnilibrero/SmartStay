import { useState, useEffect } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { DollarSign, Eye, CheckCircle, XCircle, Clock } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'

export default function HomeownerLedger() {
  const { user, fetchTransactions, updateTransactionStatus } = useAuthStore()
  const { addToast, systemConfirm } = useAppStore()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState(null)
  const [viewImageUrl, setViewImageUrl] = useState(null)

  const loadData = () => {
    setLoading(true)
    fetchTransactions().then(txs => {
      setTransactions(txs.filter(t => t.owner_id === user.id))
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
      setTransactions(txs.filter(t => t.owner_id === user.id))
    }).catch(err => console.error('Silent refresh error:', err))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime: silently update when transactions change
  useEffect(() => {
    const channel = supabase
      .channel('homeowner-ledger-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        refreshData()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const handleStatusChange = async (id, status) => {
    const isVerified = status === 'verified'
    const confirmed = await systemConfirm(
      isVerified 
        ? 'Are you sure this payment has arrived in your account?' 
        : 'Are you sure you want to reject this payment? The tenant will be notified.'
    )
    if (!confirmed) return

    setActioningId(id)
    try {
      await updateTransactionStatus(id, status)
      addToast(`Payment marked as ${status}`, 'success')
      setTransactions(prev => prev.map(t => t.id === id ? { ...t, status } : t))
    } catch (err) {
      console.error(err)
      addToast('Failed to update status', 'error')
    } finally {
      setActioningId(null)
    }
  }

  if (loading) return <div className="p-12 text-center text-stone-400">Loading ledger...</div>

  // Sort: Pending first, then by date desc
  const sortedTransactions = [...transactions].sort((a, b) => {
    if (a.status === 'pending_verification' && b.status !== 'pending_verification') return -1
    if (b.status === 'pending_verification' && a.status !== 'pending_verification') return 1
    return new Date(b.payment_date) - new Date(a.payment_date)
  })

  const totalEarningsThisMonth = transactions
    .filter(t => t.status === 'verified')
    .filter(t => {
      const d = new Date(t.payment_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, t) => sum + t.amount, 0)

  return (
    <>
      <div className="page-enter w-full max-w-full space-y-6 px-4 sm:px-6 pt-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">Transaction Ledger</h1>
          <p className="text-sm text-stone-500 mt-1">Manage and verify tenant payments</p>
        </div>
        <Card className="px-4 py-2 flex items-center gap-3 bg-teal-50 border-teal-100">
          <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
            <DollarSign size={16} />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-teal-600 font-bold">Earned this Month</p>
            <p className="text-lg font-black text-teal-800">₱{totalEarningsThisMonth.toLocaleString()}</p>
          </div>
        </Card>
      </div>

      <Card className="w-full overflow-hidden border border-stone-200">
        <div className="w-full overflow-x-auto pb-2">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200">
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Tenant</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Amount/Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Receipt</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Status / Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {sortedTransactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-stone-400 text-sm">
                    No transactions yet.
                  </td>
                </tr>
              )}
              {sortedTransactions.map(tx => (
                <tr key={tx.id} className={`hover:bg-stone-50/50 transition-colors ${tx.status === 'pending_verification' ? 'bg-amber-50/30' : ''}`}>
                  <td className="px-4 py-4 text-sm text-stone-800 font-medium">
                    {new Date(tx.payment_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4 text-sm font-semibold text-stone-800">
                    {tx.tenant?.full_name || 'Unknown Tenant'}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-stone-800">{tx.property?.name}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-bold text-stone-800">₱{tx.amount.toLocaleString()}</p>
                    <p className="text-[11px] text-stone-500 capitalize">{tx.payment_type.replace('_', ' ')}</p>
                  </td>
                  <td className="px-4 py-4">
                    {tx.receipt_url ? (
                      <button onClick={() => setViewImageUrl(tx.receipt_url)} className="inline-flex items-center text-xs font-medium text-[--teal] hover:text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100 transition-colors">
                        <Eye size={14} className="mr-1.5" /> View Proof
                      </button>
                    ) : (
                      <span className="text-xs text-stone-400">No Receipt</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {tx.status === 'pending_verification' ? (
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="primary" disabled={actioningId === tx.id} onClick={() => handleStatusChange(tx.id, 'verified')}>Verify</Button>
                        <Button size="sm" variant="danger" disabled={actioningId === tx.id} onClick={() => handleStatusChange(tx.id, 'rejected')}>Reject</Button>
                      </div>
                    ) : (
                      <Badge variant={tx.status === 'verified' ? 'teal' : 'coral'} className="uppercase text-[10px]">
                        {tx.status}
                      </Badge>
                    )}
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
