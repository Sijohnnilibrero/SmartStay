import { useState, useEffect, useMemo } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { DollarSign, Eye, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import NotificationBell from '@/components/layout/NotificationBell'

export default function HomeownerLedger() {
  const { user, fetchTransactions, updateTransactionStatus, fetchReservations } = useAuthStore()
  const { addToast, systemConfirm } = useAppStore()
  
  const [activeTab, setActiveTab] = useState('active_tenants') // 'active_tenants' | 'history'
  
  const [transactions, setTransactions] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioningId, setActioningId] = useState(null)
  const [viewImageUrl, setViewImageUrl] = useState(null)
  
  const [filterTenant, setFilterTenant] = useState('all')
  const [filterProperty, setFilterProperty] = useState('all')

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchTransactions(),
      fetchReservations()
    ]).then(([txs, resps]) => {
      setTransactions(txs.filter(t => t.owner_id === user.id))
      setReservations(resps.filter(r => r.owner_id === user.id && r.status === 'confirmed'))
    }).catch(err => {
      console.error('FETCH ERROR:', err)
      addToast(`Failed to load ledger: ${err.message || err.details || JSON.stringify(err)}`, 'error')
    }).finally(() => {
      setLoading(false)
    })
  }

  const refreshData = () => {
    Promise.all([fetchTransactions(), fetchReservations()]).then(([txs, resps]) => {
      setTransactions(txs.filter(t => t.owner_id === user.id))
      setReservations(resps.filter(r => r.owner_id === user.id && r.status === 'confirmed'))
    }).catch(err => console.error('Silent refresh error:', err))
  }

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    const channel = supabase
      .channel('homeowner-ledger-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => { refreshData() })
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

  const totalEarningsThisMonth = transactions
    .filter(t => t.status === 'verified')
    .filter(t => {
      const d = new Date(t.payment_date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    })
    .reduce((sum, t) => sum + t.amount, 0)

  // -- active tenants logic --
  const activeTenantsBalances = reservations.map(res => {
    const resTxs = transactions.filter(t => t.tenant_id === res.tenant_id && t.property_id === res.property_id && t.status === 'verified')
    const totalPaid = resTxs.reduce((sum, t) => sum + t.amount, 0)
    const totalDue = res.amount_total || 0 // simplifying: for transient it's total, for long term it's monthly
    
    // Naive logic: if they paid less than what is due currently, they owe
    const isPaid = totalPaid >= totalDue

    return {
      reservation: res,
      totalPaid,
      totalDue,
      isPaid
    }
  })

  // -- history filters logic --
  const uniqueTenants = [...new Map(transactions.map(t => [t.tenant_id, { id: t.tenant_id, full_name: t.tenant?.full_name || 'Unknown' }])).values()]
  const uniqueProperties = [...new Map(transactions.map(t => [t.property_id, { id: t.property_id, name: t.property?.name || 'Unknown' }])).values()]

  let filteredTxs = transactions
  if (filterTenant !== 'all') filteredTxs = filteredTxs.filter(t => t.tenant_id === filterTenant)
  if (filterProperty !== 'all') filteredTxs = filteredTxs.filter(t => t.property_id === filterProperty)

  const sortedTransactions = [...filteredTxs].sort((a, b) => {
    if (a.status === 'pending_verification' && b.status !== 'pending_verification') return -1
    if (b.status === 'pending_verification' && a.status !== 'pending_verification') return 1
    return new Date(b.payment_date) - new Date(a.payment_date)
  })

  return (
    <>
      <div className="page-enter w-full max-w-full space-y-6 px-4 sm:px-6 pt-5 overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-lg md:text-xl font-bold text-stone-800">Transaction Ledger</h1>
            <p className="text-sm text-stone-500 mt-1">Manage and verify tenant payments</p>
          </div>
          <div className="flex items-center gap-3">
            <NotificationBell />
            <Card className="px-4 py-2 flex items-center gap-3 bg-teal-50 border-teal-100 shadow-sm">
              <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center">
                <DollarSign size={16} />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider text-teal-600 font-bold">Earned this Month</p>
                <p className="text-lg font-black text-teal-800">₱{totalEarningsThisMonth.toLocaleString()}</p>
              </div>
            </Card>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-stone-200 gap-6 px-2">
          <button 
            onClick={() => setActiveTab('active_tenants')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'active_tenants' ? 'text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Active Tenants
            {activeTab === 'active_tenants' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full"></div>}
          </button>
          <button 
            onClick={() => setActiveTab('history')}
            className={`pb-3 text-sm font-semibold transition-colors relative ${activeTab === 'history' ? 'text-teal-700' : 'text-stone-500 hover:text-stone-700'}`}
          >
            Transaction History
            {activeTab === 'history' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-teal-600 rounded-t-full"></div>}
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'active_tenants' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeTenantsBalances.length === 0 && (
               <div className="col-span-full p-12 text-center text-stone-400 text-sm bg-white rounded-xl border border-stone-200">
                 No active tenants currently renting your properties.
               </div>
            )}
            {activeTenantsBalances.map((b, i) => (
              <Card key={i} className="p-5 flex flex-col gap-4 border border-stone-200 hover:border-teal-200 transition-colors shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {b.reservation.tenant_avatar ? (
                      <img src={b.reservation.tenant_avatar} alt="Avatar" className="w-10 h-10 rounded-full object-cover border border-stone-200" />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-stone-100 flex items-center justify-center text-stone-400 font-bold border border-stone-200">
                        {b.reservation.tenant_name?.charAt(0) || 'U'}
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-stone-800 text-sm">{b.reservation.tenant_name}</p>
                      <p className="text-[11px] text-stone-500 font-medium">{b.reservation.property_name}</p>
                    </div>
                  </div>
                  {b.isPaid ? (
                    <Badge variant="teal" className="flex items-center gap-1 uppercase tracking-wider text-[9px] shadow-sm whitespace-nowrap px-2">
                      <CheckCircle size={10} /> Paid
                    </Badge>
                  ) : (
                    <Badge variant="amber" className="flex items-center gap-1 uppercase tracking-wider text-[9px] shadow-sm whitespace-nowrap px-2">
                      <Clock size={10} /> Due
                    </Badge>
                  )}
                </div>
                
                <div className="grid grid-cols-2 gap-2 bg-stone-50 rounded-xl p-3 border border-stone-100">
                   <div>
                     <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Current Due</p>
                     <p className="font-bold text-stone-800 text-sm">₱{b.totalDue.toLocaleString()}</p>
                   </div>
                   <div>
                     <p className="text-[10px] text-stone-500 font-semibold uppercase tracking-wider">Total Paid</p>
                     <p className="font-bold text-teal-700 text-sm">₱{b.totalPaid.toLocaleString()}</p>
                   </div>
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="w-full overflow-hidden border border-stone-200 shadow-sm">
            {/* Filters */}
            <div className="p-4 border-b border-stone-100 bg-stone-50/50 flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter size={14} className="text-stone-400" />
                <span className="text-xs font-semibold text-stone-600">Filters:</span>
              </div>
              <select 
                value={filterProperty} 
                onChange={e => setFilterProperty(e.target.value)}
                className="text-xs bg-white border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              >
                <option value="all">All Properties</option>
                {uniqueProperties.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <select 
                value={filterTenant} 
                onChange={e => setFilterTenant(e.target.value)}
                className="text-xs bg-white border border-stone-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 font-medium"
              >
                <option value="all">All Tenants</option>
                {uniqueTenants.map(t => <option key={t.id} value={t.id}>{t.full_name}</option>)}
              </select>
            </div>

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
                        No transactions found matching your filters.
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
                          <button onClick={() => setViewImageUrl(tx.receipt_url)} className="inline-flex items-center text-xs font-medium text-[--teal] hover:text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100 transition-colors shadow-sm">
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
                          <Badge variant={tx.status === 'verified' ? 'teal' : 'coral'} className="uppercase text-[10px] shadow-sm">
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
        )}
      </div>

      {/* Image View Modal */}
      {viewImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm" onClick={() => setViewImageUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button className="absolute -top-10 right-0 text-white hover:text-stone-300 font-bold transition-colors" onClick={() => setViewImageUrl(null)}>
              Close
            </button>
            <img src={viewImageUrl} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" onClick={e => e.stopPropagation()} />
          </div>
        </div>
      )}
    </>
  )
}
