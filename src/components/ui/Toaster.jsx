import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { CheckCircle2, XCircle, AlertCircle, Info, X } from 'lucide-react'

export default function Toaster() {
  const toasts = useAppStore((s) => s.toasts)
  const removeToast = useAppStore((s) => s.removeToast)

  return (
    <div className="fixed top-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none max-w-[90vw]">
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
  const isInfo = toast.type === 'info'

  let containerStyles = ''
  let iconElement = null
  let btnStyles = ''

  if (isError) {
    containerStyles = 'bg-red-50/95 dark:bg-stone-900/95 border-red-200 dark:border-rose-900/60 text-red-900 dark:text-rose-200 shadow-xl shadow-red-950/10 dark:shadow-black/60'
    iconElement = <XCircle className="w-5 h-5 text-red-600 dark:text-rose-400 shrink-0" />
    btnStyles = 'hover:bg-red-200/50 dark:hover:bg-rose-950/60 text-red-600 dark:text-rose-400'
  } else if (isInfo) {
    containerStyles = 'bg-teal-50/95 dark:bg-stone-900/95 border-teal-200 dark:border-teal-900/60 text-teal-900 dark:text-teal-200 shadow-xl shadow-teal-950/10 dark:shadow-black/60'
    iconElement = <Info className="w-5 h-5 text-teal-600 dark:text-teal-400 shrink-0" />
    btnStyles = 'hover:bg-teal-200/50 dark:hover:bg-teal-950/60 text-teal-600 dark:text-teal-400'
  } else {
    // Success
    containerStyles = 'bg-emerald-50/95 dark:bg-stone-900/95 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200 shadow-xl shadow-emerald-950/10 dark:shadow-black/60'
    iconElement = <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
    btnStyles = 'hover:bg-emerald-200/50 dark:hover:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
  }

  return (
    <div className={`pointer-events-auto flex items-center justify-between gap-3 w-80 sm:w-96 px-4 py-3.5 rounded-2xl backdrop-blur-md border animate-in slide-in-from-right fade-in duration-300 ${containerStyles}`}>
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {iconElement}
        <p className="text-xs sm:text-sm font-semibold leading-snug truncate">{toast.msg}</p>
      </div>
      <button 
        type="button"
        onClick={onRemove} 
        className={`p-1.5 rounded-xl transition-colors cursor-pointer shrink-0 ${btnStyles}`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
