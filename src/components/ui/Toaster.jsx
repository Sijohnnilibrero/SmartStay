import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { CheckCircle2, XCircle, X } from 'lucide-react'

export default function Toaster() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onRemove={() => removeToast(toast.id)} />
      ))}
    </div>
  )
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onRemove()
    }, 4000)
    return () => clearTimeout(timer)
  }, [onRemove])

  const isError = toast.type === 'error'

  return (
    <div className={`pointer-events-auto flex items-center justify-between gap-3 w-80 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right fade-in duration-300 ${
      isError ? 'bg-red-50 border-red-200 text-red-800' : 'bg-emerald-50 border-emerald-200 text-emerald-800'
    }`}>
      <div className="flex items-center gap-3">
        {isError ? <XCircle className="w-5 h-5 text-red-500 shrink-0" /> : <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />}
        <p className="text-sm font-medium leading-snug">{toast.msg}</p>
      </div>
      <button onClick={onRemove} className={`p-1 rounded-md transition-colors ${
        isError ? 'hover:bg-red-100 text-red-500' : 'hover:bg-emerald-100 text-emerald-600'
      }`}>
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
