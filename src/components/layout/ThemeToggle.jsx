import { Sun, Moon } from 'lucide-react'
import { useAppStore } from '@/store/useAppStore'

export default function ThemeToggle({ className = '' }) {
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)

  return (
    <button
      onClick={toggleTheme}
      className={`p-2 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors ${className}`}
      title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
      aria-label="Toggle Theme"
    >
      {theme === 'dark' ? (
        <Sun size={18} className="text-amber-400 hover:text-amber-300 transition-colors" />
      ) : (
        <Moon size={18} className="text-purple-600 hover:text-purple-700 transition-colors" />
      )}
    </button>
  )
}
