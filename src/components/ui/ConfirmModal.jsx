import { useAppStore } from '@/store/useAppStore'

export default function ConfirmModal() {
  const confirmState = useAppStore((s) => s.confirmState)
  const resolveConfirm = useAppStore((s) => s.resolveConfirm)

  if (!confirmState.isOpen) return null

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={() => resolveConfirm(false)}
      />
      
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          </div>
          <h3 className="text-lg font-bold text-stone-900 mb-2">Are you sure?</h3>
          <p className="text-sm text-stone-500 mb-6">{confirmState.msg}</p>
          
          <div className="flex gap-3">
            <button 
              className="flex-1 px-4 py-2 rounded-xl text-stone-700 bg-stone-100 hover:bg-stone-200 font-medium transition-colors"
              onClick={() => resolveConfirm(false)}
            >
              Cancel
            </button>
            <button 
              className="flex-1 px-4 py-2 rounded-xl text-white bg-red-500 hover:bg-red-600 font-medium transition-colors"
              onClick={() => resolveConfirm(true)}
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
