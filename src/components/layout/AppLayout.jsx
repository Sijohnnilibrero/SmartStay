import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useAppStore } from '@/store/useAppStore'
import { Menu } from 'lucide-react'

export default function AppLayout() {
  const sidebarOpen = useAppStore((s) => s.sidebarOpen)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

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
            <p className="font-bold text-lg text-stone-900 leading-tight">SmartStay</p>
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
    </div>
  )
}
