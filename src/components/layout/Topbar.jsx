import NotificationBell from './NotificationBell'

export default function Topbar({ title, children }) {
  return (
    <header className="flex items-center justify-between px-4 md:px-6 py-4 bg-white border-b border-stone-200 sticky top-0 z-10 shrink-0">
      <h1 className="font-bold text-lg md:text-xl text-stone-900">{title}</h1>
      <div className="flex items-center gap-2 md:gap-3">
        {children}
        <NotificationBell />
      </div>
    </header>
  )
}
