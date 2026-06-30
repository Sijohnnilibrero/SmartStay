import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAppStore } from '@/store/useAppStore'
import { Menu } from 'lucide-react'
import Toaster from '@/components/ui/Toaster'
import ConfirmModal from '@/components/ui/ConfirmModal'
import { useGlobalRealtime } from '@/hooks/useGlobalRealtime'

export default function AppLayout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  useGlobalRealtime()

  return (
    <div className="flex min-h-screen bg-stone-50">
      {/* Desktop Sidebar (always visible on md+) */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm transition-opacity" 
            onClick={toggleSidebar}
          />
          {/* Sidebar Drawer */}
          <div className="relative flex w-[260px] flex-col bg-white h-full shadow-2xl animate-in slide-in-from-left duration-300">
            <Sidebar />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 min-w-0 overflow-auto flex flex-col h-screen">
        {/* Mobile Header (Global) */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-stone-200 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-orange-100 flex items-center justify-center text-sm">🏠</div>
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-lg text-stone-900 leading-tight">SmartStay</p>
              <span 
                className="px-1.5 py-0.5 bg-stone-100 text-stone-600 text-[9px] font-bold tracking-wider rounded border border-stone-200 cursor-help" 
                title="SmartStay is in early beta development. You may encounter bugs."
              >
                BETA
              </span>
            </div>
          </div>
          <button 
            onClick={toggleSidebar}
            className="p-2 -mr-2 text-stone-500 hover:bg-stone-100 rounded-lg transition-colors"
            aria-label="Toggle Menu"
          >
            <Menu size={22} />
          </button>
        </div>

        <Outlet />
      </main>

      {/* Global Overlays */}
      <Toaster />
      <ConfirmModal />
    </div>
  )
}
