import { Bell, Search } from 'lucide-react'

export default function Topbar({ title, children }) {
  return (
    <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-stone-200 sticky top-0 z-10">
      <h1 className="font-bold text-xl text-stone-900">{title}</h1>
      <div className="flex items-center gap-3">
        {children}
        <button className="relative p-2 rounded-lg hover:bg-stone-50 text-stone-400 transition-colors">
          <Bell size={17} />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[--coral] rounded-full" />
        </button>
      </div>
    </header>
  )
}
