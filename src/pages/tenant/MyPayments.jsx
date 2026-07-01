import { useState, useEffect } from 'react'
import { Card, Button, Badge } from '@/components/ui'
import { useAuthStore } from '@/store/useAuthStore'
import { useAppStore } from '@/store/useAppStore'
import { supabase } from '@/lib/supabase'
import { DollarSign, Upload, Clock, CheckCircle, XCircle, Search, Calendar, Eye, AlertTriangle } from 'lucide-react'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { calculateNextDueDate, formatCurrency } from '@/lib/utils'

export default function MyPayments() {
  const { user, fetchTransactions, fetchReservations, createTransaction, uploadTransactionReceipt, deleteTransaction, updateTransaction } = useAuthStore()
  const { addToast, systemConfirm } = useAppStore()
  const [transactions, setTransactions] = useState([])
  const [reservations, setReservations] = useState([])
  const [loading, setLoading] = useState(true)
  const [actioning, setActioning] = useState(false)
  const [showLogModal, setShowLogModal] = useState(false)
  const [viewImageUrl, setViewImageUrl] = useState(null)
  const [editReceiptTx, setEditReceiptTx] = useState(null)
  
  // Log Payment Form State
  const [form, setForm] = useState({
    reservation_id: '',
    amount: '',
    payment_type: 'monthly_rent',
    payment_date: new Date().toISOString().split('T')[0],
  })
  const [editForm, setEditForm] = useState({
    reservation_id: '',
    amount: '',
    payment_type: 'monthly_rent',
    payment_date: '',
  })
  const [receiptFile, setReceiptFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)

  const loadData = () => {
    setLoading(true)
    Promise.all([
      fetchTransactions(),
      fetchReservations()
    ]).then(([txs, resps]) => {
      // Txs are already scoped by RLS. But let's be sure it's the tenant's view.
      setTransactions(txs.filter(t => t.tenant_id === user.id))
      // Get approved/ongoing reservations to log payments against
      setReservations(resps.filter(r => r.tenant_id === user.id && ['approved', 'confirmed'].includes(r.status)))
    }).catch(err => {
      console.error('FETCH ERROR:', err)
      addToast(`Failed to load transactions: ${err.message || err.details || JSON.stringify(err)}`, 'error')
    }).finally(() => {
      setLoading(false)
    })
  }

  // Silent refresh — no loading spinner, data just swaps in
  const refreshData = () => {
    Promise.all([
      fetchTransactions(),
      fetchReservations()
    ]).then(([txs, resps]) => {
      setTransactions(txs.filter(t => t.tenant_id === user.id))
      setReservations(resps.filter(r => r.tenant_id === user.id && ['approved', 'confirmed'].includes(r.status)))
    }).catch(err => console.error('Silent refresh error:', err))
  }

  useEffect(() => {
    loadData()
  }, [])

  // Realtime: silently update when transactions change
  useEffect(() => {
    const channel = supabase
      .channel('tenant-payments-transactions')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        refreshData()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [])

  const handleLogPayment = async (e) => {
    e.preventDefault()
    if (!form.reservation_id) return addToast('Select a property/reservation', 'error')
    if (!form.amount || isNaN(form.amount)) return addToast('Enter a valid amount', 'error')
    if (!receiptFile) return addToast('Please upload a proof of payment', 'error')

    const res = reservations.find(r => r.id === form.reservation_id)
    if (!res) return addToast('Invalid reservation', 'error')

    setActioning(true)
    try {
      const receipt_url = await uploadTransactionReceipt(receiptFile)
      await createTransaction({
        reservation_id: res.id,
        owner_id: res.owner_id,
        property_id: res.property_id,
        amount: parseFloat(form.amount),
        payment_type: form.payment_type,
        payment_date: form.payment_date,
        receipt_url
      })
      addToast('Payment logged successfully!', 'success')
      setForm({ reservation_id: '', amount: '', payment_type: 'monthly_rent', payment_date: new Date().toISOString().split('T')[0] })
      setReceiptFile(null)
      setPreviewUrl(null)
      setShowLogModal(false)
      loadData()
    } catch (err) {
      console.error(err)
      addToast('Failed to log payment', 'error')
    } finally {
      setActioning(false)
    }
  }

  const handleCancelTransaction = async (id) => {
    const confirmed = await systemConfirm("Are you sure you want to cancel this payment? This action cannot be undone.")
    if (!confirmed) return
    
    setActioning(true)
    try {
      await deleteTransaction(id)
      addToast('Payment cancelled successfully', 'success')
      setTransactions(prev => prev.filter(t => t.id !== id))
    } catch (err) {
      console.error('CANCEL ERROR:', err)
      addToast(`Failed to cancel payment: ${err.message || err.details || JSON.stringify(err)}`, 'error')
    } finally {
      setActioning(false)
    }
  }

  const handleEditReceipt = async (e) => {
    e.preventDefault()
    if (!editReceiptTx) return
    
    setActioning(true)
    try {
      let url = editReceiptTx.receipt_url
      if (receiptFile) {
        url = await uploadTransactionReceipt(receiptFile)
      }
      
      const res = reservations.find(r => r.id === editForm.reservation_id)
      
      const updates = {
        reservation_id: editForm.reservation_id,
        owner_id: res?.owner_id || editReceiptTx.owner_id,
        property_id: res?.property_id || editReceiptTx.property_id,
        amount: editForm.amount,
        payment_type: editForm.payment_type,
        payment_date: editForm.payment_date,
        receipt_url: url
      }
      
      await updateTransaction(editReceiptTx.id, updates)
      
      addToast('Payment updated successfully', 'success')
      loadData()
      setEditReceiptTx(null)
      setReceiptFile(null)
      setPreviewUrl(null)
    } catch (err) {
      console.error('UPDATE ERROR:', err)
      addToast(`Failed to update payment: ${err.message || err.details || JSON.stringify(err)}`, 'error')
    } finally {
      setActioning(false)
    }
  }

  if (loading) return <div className="p-12 text-center text-stone-400">Loading payments...</div>

  return (
    <>
      <div className="page-enter max-w-5xl w-full mx-auto space-y-6 px-4 sm:px-6 pt-5 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-800">My Payments</h1>
          <p className="text-sm text-stone-500 mt-1">Track your rent payments and deposits</p>
        </div>
        <Button onClick={() => setShowLogModal(true)}>
          <Upload size={16} className="mr-2" /> Log New Payment
        </Button>
      </div>

      {/* Due Date Banners */}
      {reservations.map(res => {
        var dueData = calculateNextDueDate(res, transactions.filter(t => t.reservation_id === res.id))
        if (!dueData || (!dueData.isOverdue && !dueData.isUpcoming)) return null
        return (
          <div key={`due-${res.id}`} className={`p-4 rounded-xl border-l-4 shadow-sm flex items-start gap-3 ${dueData.isOverdue ? 'bg-red-50 border-red-500' : 'bg-orange-50 border-orange-500'}`}>
            <div className={`p-2 rounded-full ${dueData.isOverdue ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h4 className={`font-bold text-sm ${dueData.isOverdue ? 'text-red-800' : 'text-orange-800'}`}>
                {dueData.isOverdue ? 'Rent is Overdue' : 'Rent is Due Soon'} - {res.property?.name}
              </h4>
              <p className={`text-xs mt-1 ${dueData.isOverdue ? 'text-red-700' : 'text-orange-700'}`}>
                Your monthly rent is <strong>{formatCurrency(res.amount_total / res.duration_months)}</strong>. 
                You have verified payments of {formatCurrency((res.amount_total / res.duration_months) - dueData.amountDue)} for this billing cycle.
                <br />
                Please log a payment for your remaining balance of <strong>{formatCurrency(dueData.amountDue)}</strong> {dueData.isOverdue ? 'as soon as possible.' : `by ${dueData.dateString}.`}
              </p>
              <button onClick={() => {
                setForm({...form, reservation_id: res.id, amount: dueData.amountDue})
                setShowLogModal(true)
              }} className={`inline-flex items-center gap-1 mt-2 text-xs font-semibold px-3 py-1.5 rounded-lg ${dueData.isOverdue ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-orange-100 text-orange-700 hover:bg-orange-200'} transition-colors`}>
                Pay Remaining Balance &rarr;
              </button>
            </div>
          </div>
        )
      })}

      <Card className="w-full overflow-hidden border border-stone-200">
        <div className="w-full overflow-x-auto pb-2">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-stone-50/80 border-b border-stone-200">
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Property</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Amount</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-xs font-semibold text-stone-500 uppercase tracking-wider text-right">Receipt & Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {transactions.length === 0 && (
                <tr>
                  <td colSpan="6" className="px-4 py-8 text-center text-stone-400 text-sm">
                    No payment history found.
                  </td>
                </tr>
              )}
              {transactions.map(tx => (
                <tr key={tx.id} className="hover:bg-stone-50/50 transition-colors">
                  <td className="px-4 py-4 text-sm text-stone-800 font-medium">
                    {new Date(tx.payment_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-semibold text-stone-800">
                      {tx.property?.name || 'Unknown Property'} 
                      {tx.reservation?.rooms?.room_number ? ` - Room ${tx.reservation.rooms.room_number}` : ''}
                    </p>
                    <p className="text-[11px] text-stone-500 truncate max-w-[150px]">{tx.property?.address}</p>
                  </td>
                  <td className="px-4 py-4 text-sm text-stone-600 capitalize">
                    {tx.payment_type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-4 text-sm font-bold text-stone-800">
                    ₱{tx.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-4">
                    {tx.status === 'verified' && <Badge variant="teal"><CheckCircle size={12} className="mr-1"/> Verified</Badge>}
                    {tx.status === 'pending_verification' && <Badge variant="amber"><Clock size={12} className="mr-1"/> Pending</Badge>}
                    {tx.status === 'rejected' && <Badge variant="coral"><XCircle size={12} className="mr-1"/> Rejected</Badge>}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {tx.receipt_url && (
                        <button onClick={() => setViewImageUrl(tx.receipt_url)} className="inline-flex items-center text-xs font-medium text-teal-600 hover:text-teal-700 bg-teal-50 px-2.5 py-1.5 rounded-lg border border-teal-100 transition-colors">
                          <Eye size={14} className="mr-1.5" /> View Proof
                        </button>
                      )}
                      {tx.status === 'pending_verification' && (
                        <>
                          <Button size="sm" variant="ghost" className="text-xs border border-stone-200" disabled={actioning} onClick={() => {
                            setEditReceiptTx(tx)
                            setEditForm({
                              reservation_id: tx.reservation_id,
                              amount: tx.amount,
                              payment_type: tx.payment_type,
                              payment_date: tx.payment_date.split('T')[0]
                            })
                            setPreviewUrl(tx.receipt_url)
                            setReceiptFile(null)
                          }}>Edit Payment</Button>
                          <Button size="sm" variant="ghost" className="text-xs text-red-600 border border-red-100 hover:bg-red-50" disabled={actioning} onClick={() => handleCancelTransaction(tx.id)}>Cancel</Button>
                        </>
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

      {/* Log Payment Modal */}
      {showLogModal && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 mt-10 sm:mt-0 flex flex-col max-h-[85vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-stone-800 mb-4 flex-shrink-0">Log a Payment</h2>
            
            <form onSubmit={handleLogPayment} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Select Reservation</label>
                <select 
                  required
                  value={form.reservation_id}
                  onChange={e => setForm({...form, reservation_id: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                >
                  <option value="">-- Select --</option>
                  {reservations.map(r => (
                    <option key={r.id} value={r.id}>{r.property_name} (₱{r.price_monthly}/mo)</option>
                  ))}
                </select>
                {reservations.length === 0 && (
                  <p className="text-[10px] text-amber-600 mt-1 flex items-center gap-1"><AlertTriangle size={10}/> You have no active reservations to pay for.</p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Payment Type</label>
                  <select 
                    value={form.payment_type}
                    onChange={e => setForm({...form, payment_type: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  >
                    <option value="monthly_rent">Monthly Rent</option>
                    <option value="initial_deposit">Initial Deposit</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Date Paid</label>
                  <input 
                    type="date" 
                    required
                    value={form.payment_date}
                    onChange={e => setForm({...form, payment_date: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Amount Paid (₱)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={form.amount}
                  onChange={e => setForm({...form, amount: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 font-semibold text-stone-800"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Proof of Payment</label>
                <div className="flex flex-col gap-3">
                  <input 
                    type="file"
                    required
                    accept="image/*,application/pdf"
                    onChange={e => {
                      const file = e.target.files[0];
                      setReceiptFile(file);
                      if (file && file.type.startsWith('image/')) {
                        setPreviewUrl(URL.createObjectURL(file));
                      } else {
                        setPreviewUrl(null);
                      }
                    }}
                    className="text-sm text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 w-full"
                  />
                  {previewUrl && (
                    <div className="w-full h-32 rounded-lg border border-stone-200 overflow-hidden relative bg-stone-50">
                      <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 mt-auto">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => {
                  setShowLogModal(false)
                  setPreviewUrl(null)
                  setReceiptFile(null)
                }}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={actioning}>
                  {actioning ? 'Submitting...' : 'Submit Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Edit Receipt Modal */}
      {editReceiptTx && (
        <div className="fixed inset-0 z-[100] flex items-start sm:items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm overflow-y-auto">
          <Card className="w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-200 mt-10 sm:mt-0 flex flex-col">
            <h2 className="text-xl font-bold text-stone-800 mb-4 flex-shrink-0">Update Payment</h2>
            
            <form onSubmit={handleEditReceipt} className="space-y-4">
              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Select Reservation</label>
                <select 
                  required
                  value={editForm.reservation_id}
                  onChange={e => setEditForm({...editForm, reservation_id: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                >
                  <option value="">-- Select --</option>
                  {reservations.map(r => (
                    <option key={r.id} value={r.id}>{r.property_name} (₱{r.price_monthly}/mo)</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Payment Type</label>
                  <select 
                    value={editForm.payment_type}
                    onChange={e => setEditForm({...editForm, payment_type: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  >
                    <option value="monthly_rent">Monthly Rent</option>
                    <option value="initial_deposit">Initial Deposit</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Date Paid</label>
                  <input 
                    type="date" 
                    required
                    value={editForm.payment_date}
                    onChange={e => setEditForm({...editForm, payment_date: e.target.value})}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Amount Paid (₱)</label>
                <input 
                  type="number" 
                  required
                  min="1"
                  placeholder="e.g. 5000"
                  value={editForm.amount}
                  onChange={e => setEditForm({...editForm, amount: e.target.value})}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-400/30 font-semibold text-stone-800"
                />
              </div>

              <div>
                <label className="text-xs uppercase tracking-wider text-stone-500 font-semibold mb-1 block">Proof of Payment</label>
                <div className="flex flex-col gap-3">
                  <input 
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={e => {
                      const file = e.target.files[0];
                      setReceiptFile(file);
                      if (file && file.type.startsWith('image/')) {
                        setPreviewUrl(URL.createObjectURL(file));
                      } else {
                        setPreviewUrl(editReceiptTx.receipt_url);
                      }
                    }}
                    className="text-sm text-stone-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-teal-700 hover:file:bg-teal-100 w-full"
                  />
                  {previewUrl && (
                    <div className="w-full h-32 rounded-lg border border-stone-200 overflow-hidden relative bg-stone-50">
                      <img src={previewUrl} alt="Receipt Preview" className="w-full h-full object-contain" />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-2 pt-2 mt-auto">
                <Button type="button" variant="ghost" className="flex-1" onClick={() => {
                  setEditReceiptTx(null)
                  setPreviewUrl(null)
                  setReceiptFile(null)
                }}>Cancel</Button>
                <Button type="submit" variant="primary" className="flex-1" disabled={actioning}>
                  {actioning ? 'Updating...' : 'Update Payment'}
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Image View Modal */}
      {viewImageUrl && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-stone-900/80 backdrop-blur-sm" onClick={() => setViewImageUrl(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh] flex flex-col items-center">
            <button className="absolute -top-10 right-0 text-white hover:text-stone-300 font-bold" onClick={() => setViewImageUrl(null)}>
              Close
            </button>
            <img src={viewImageUrl} alt="Receipt" className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl" />
          </div>
        </div>
      )}
    </>
  )
}
