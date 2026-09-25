export default function Topbar({ children }) {
  if (!children) return null
  return (
    <div className="flex items-center justify-end px-4 sm:px-6 pt-3 shrink-0">
      {children}
    </div>
  )
}
