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

      {/* Single Sidebar instance — CSS handles both desktop sticky and mobile overlay */}
      {/* Mobile backdrop (only visible on small screens when open) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar: fixed overlay on mobile, sticky side panel on desktop */}
      <div
        className={[
          // Desktop: always visible, sticky, not fullscreen
          'md:block md:sticky md:top-0 md:h-screen md:flex-shrink-0 md:w-[220px] md:translate-x-0',
          // Mobile: fixed overlay drawer, slides in/out
          'fixed top-0 left-0 h-full z-50 w-[260px] transition-transform duration-300',
          'md:static md:z-auto md:transition-none',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
      >
        <Sidebar />
      </div>

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
