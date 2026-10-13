const fs = require('fs');
const path = require('path');

const srcDir = 'c:\\Users\\Administrator\\Desktop\\SmartStay_yudanay_system_ba\\smartstay-vite\\smartstay\\src';

// 1. Update Reservations.jsx
const resPath = path.join(srcDir, 'pages', 'Reservations.jsx');
let resContent = fs.readFileSync(resPath, 'utf8');

// Update import to include PaymentCountdown and isPaymentExpired
if (!resContent.includes("PaymentCountdown")) {
  resContent = resContent.replace(
    "import { Card, Badge, Avatar, Button } from '@/components/ui'",
    "import { Card, Badge, Avatar, Button, PaymentCountdown, isPaymentExpired } from '@/components/ui'"
  );
}

// Add expireReservation store hook
if (!resContent.includes("var expireReservation =")) {
  resContent = resContent.replace(
    "  var uploadPaymentReceipt = useAuthStore(function (s) { return s.uploadPaymentReceipt })",
    "  var uploadPaymentReceipt = useAuthStore(function (s) { return s.uploadPaymentReceipt })\n  var expireReservation = useAuthStore(function (s) { return s.expireReservation })"
  );
}

// Add Alert Banner right above <Card className="p-0 overflow-hidden">
const bannerCode = `
        {/* Tenant Payment Deadline Alert Banner */}
        {isTenant && reservations.some(r => r.status === 'awaiting_payment' && !r.payment_receipt_url) && (
          <div className="space-y-2">
            {reservations.filter(r => r.status === 'awaiting_payment' && !r.payment_receipt_url).map(r => (
              <PaymentCountdown key={'banner-countdown-' + r.id} reservation={r} onExpire={() => expireReservation(r.id)} />
            ))}
          </div>
        )}
`;

if (!resContent.includes("{/* Tenant Payment Deadline Alert Banner */}")) {
  resContent = resContent.replace(
    "        <Card className=\"p-0 overflow-hidden\">",
    bannerCode + "\n        <Card className=\"p-0 overflow-hidden\">"
  );
}

// Update Expires On cell to use PaymentCountdown for awaiting_payment
const oldExpiresCell = `                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] whitespace-nowrap font-medium">
                          {(() => {
                            if (!r.check_in) return '—'
                            const d = new Date(r.check_in)
                            d.setMonth(d.getMonth() + (r.duration_months || 1))
                            const isPast = d < new Date()
                            return (
                              <span className={isPast && r.status === 'confirmed' ? 'text-red-600 font-bold' : 'text-stone-600 dark:text-stone-300'}>
                                {d.toLocaleDateString()}
                                {isPast && r.status === 'confirmed' && (
                                  <span className="ml-1.5 text-[9px] bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 px-1.5 py-0.5 rounded-full font-bold">
                                    Expired
                                  </span>
                                )}
                              </span>
                            )
                          })()}
                        </td>`;

const newExpiresCell = `                        <td className="px-3 py-2 sm:px-4 sm:py-3 text-[10px] sm:text-[12px] whitespace-nowrap font-medium">
                          {r.status === 'awaiting_payment' ? (
                            <PaymentCountdown reservation={r} compact={true} onExpire={() => expireReservation(r.id)} />
                          ) : (() => {
                            if (!r.check_in) return '—'
                            const d = new Date(r.check_in)
                            d.setMonth(d.getMonth() + (r.duration_months || 1))
                            const isPast = d < new Date()
                            return (
                              <span className={isPast && r.status === 'confirmed' ? 'text-red-600 font-bold' : 'text-stone-600 dark:text-stone-300'}>
                                {d.toLocaleDateString()}
                                {isPast && r.status === 'confirmed' && (
                                  <span className="ml-1.5 text-[9px] bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-300 px-1.5 py-0.5 rounded-full font-bold">
                                    Expired
                                  </span>
                                )}
                              </span>
                            )
                          })()}
                        </td>`;

if (resContent.includes("{r.status === 'awaiting_payment' ? (") === false) {
  resContent = resContent.replace(oldExpiresCell, newExpiresCell);
}

// Update Tenant awaiting_payment action to lock if expired
const oldTenantAction = `                            {isTenant && r.status === 'awaiting_payment' && (
                              <div className="flex items-center gap-1 sm:gap-2">
                                <label className={"cursor-pointer px-2 py-1 flex items-center gap-1 rounded text-[9px] sm:text-[11px] transition-colors whitespace-nowrap " + (r.payment_receipt_url ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-blue-500 text-white hover:bg-blue-600')}>
                                  <Upload size={12} /> {r.payment_receipt_url ? 'Re-upload Receipt' : 'Upload Receipt'}
                                  <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadReceipt(r.id, e)} disabled={actioning === r.id} />
                                </label>
                                {r.payment_receipt_url && <span className="text-[9px] sm:text-[10px] text-green-600 font-medium">Uploaded</span>}
                                <Button className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                  Cancel
                                </Button>
                              </div>
                            )}`;

const newTenantAction = `                            {isTenant && r.status === 'awaiting_payment' && (
                              <div className="flex items-center gap-1 sm:gap-2">
                                {isPaymentExpired(r) ? (
                                  <span className="text-[10px] text-red-600 font-bold bg-red-50 dark:bg-red-950/60 px-2 py-1 rounded border border-red-200">
                                    ⌛ Deadline Expired
                                  </span>
                                ) : (
                                  <>
                                    <label className={"cursor-pointer px-2 py-1 flex items-center gap-1 rounded text-[9px] sm:text-[11px] transition-colors whitespace-nowrap " + (r.payment_receipt_url ? 'bg-stone-200 text-stone-700 hover:bg-stone-300' : 'bg-blue-500 text-white hover:bg-blue-600')}>
                                      <Upload size={12} /> {r.payment_receipt_url ? 'Re-upload Receipt' : 'Upload Receipt'}
                                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUploadReceipt(r.id, e)} disabled={actioning === r.id} />
                                    </label>
                                    {r.payment_receipt_url && <span className="text-[9px] sm:text-[10px] text-green-600 font-medium">Uploaded</span>}
                                    <Button className="px-1.5 sm:px-2 py-1 sm:py-1.5 text-[9px] sm:text-[11px] h-auto text-red-600 hover:bg-red-50" variant="ghost" disabled={actioning === r.id} onClick={function() { handleStatus(r.id, 'cancelled') }}>
                                      Cancel
                                    </Button>
                                  </>
                                )}
                              </div>
                            )}`;

if (resContent.includes("isPaymentExpired(r)") === false) {
  resContent = resContent.replace(oldTenantAction, newTenantAction);
}

fs.writeFileSync(resPath, resContent, 'utf8');
console.log('Updated Reservations.jsx');

// 2. Update MyPayments.jsx
const payPath = path.join(srcDir, 'pages', 'tenant', 'MyPayments.jsx');
let payContent = fs.readFileSync(payPath, 'utf8');

if (!payContent.includes("PaymentCountdown")) {
  payContent = payContent.replace(
    "import { Card, Button, Badge } from '@/components/ui'",
    "import { Card, Button, Badge, PaymentCountdown } from '@/components/ui'"
  );
}

// Include awaiting_payment in reservations fetched for payments
payContent = payContent.replace(
  "['approved', 'confirmed'].includes(r.status)",
  "['approved', 'awaiting_payment', 'confirmed'].includes(r.status)"
);
payContent = payContent.replace(
  "['approved', 'confirmed'].includes(r.status)",
  "['approved', 'awaiting_payment', 'confirmed'].includes(r.status)"
);

// Add countdown banner in MyPayments right above Due Date Banners
const payBanner = `
      {/* Awaiting Payment Expiration Banners */}
      {reservations.filter(r => r.status === 'awaiting_payment' && !r.payment_receipt_url).map(res => (
        <div key={'awaiting-' + res.id} className="space-y-1">
          <PaymentCountdown reservation={res} onExpire={() => refreshData()} />
        </div>
      ))}
`;

if (!payContent.includes("{/* Awaiting Payment Expiration Banners */}")) {
  payContent = payContent.replace(
    "      {/* Due Date Banners */}",
    payBanner + "\n      {/* Due Date Banners */}"
  );
}

fs.writeFileSync(payPath, payContent, 'utf8');
console.log('Updated MyPayments.jsx');
