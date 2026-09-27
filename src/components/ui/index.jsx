import { cn, getStatusColor } from '@/lib/utils'
import ConfirmModal from './ConfirmModal'
import ContractViewerModal from './ContractViewerModal'
import ImageViewerModal from './ImageViewerModal'
export { ZoomableImage } from './ZoomableImage'
export { default as SmartStayLogo } from './SmartStayLogo'

/* ── Badge ───────────────────────────────────────────── */
export function Badge({ children, variant = 'teal', className }) {
  const variants = {
    teal:   'bg-[--teal-light]   text-[--teal]   dark:text-teal-300   border border-teal-200   dark:border-teal-700/60',
    amber:  'bg-[--amber-light]  text-[--amber]  dark:text-amber-300  border border-amber-200  dark:border-amber-700/60',
    coral:  'bg-[--coral-light]  text-[--coral]  dark:text-red-400    border border-red-200    dark:border-red-700/60',
    purple: 'bg-[--purple-light] text-[--purple] dark:text-violet-400 border border-purple-200 dark:border-purple-700/60',
    gray:   'bg-stone-100        text-stone-600   dark:bg-white/10     dark:text-stone-300      border border-stone-200 dark:border-white/10',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold',
        variants[variant] || variants.gray,
        className
      )}
    >
      {children}
    </span>
  )
}

/* ── StatusBadge ──────────────────────────────────────── */
export function StatusBadge({ status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border capitalize',
        getStatusColor(status)
      )}
    >
      {status}
    </span>
  )
}

/* ── Button ──────────────────────────────────────────── */
export function Button({ children, variant = 'default', size = 'md', className, ...props }) {
  const variants = {
    default: 'bg-white border border-stone-200 text-stone-700 hover:bg-stone-50',
    primary: 'bg-[--teal] border border-[--teal] text-white hover:bg-teal-700',
    ghost:   'border-transparent text-stone-500 hover:bg-stone-100',
    danger:  'bg-red-50 border border-red-200 text-red-600 hover:bg-red-100',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs gap-1.5',
    md: 'px-4 py-2 text-sm gap-2',
    lg: 'px-5 py-2.5 text-sm gap-2',
  }
  return (
    <button
      className={cn(
        'inline-flex items-center rounded-lg font-medium transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  )
}

/* ── Card ────────────────────────────────────────────── */
export function Card({ children, className, ...props }) {
  return (
    <div
      className={cn('glass-card rounded-xl p-4 transition-all duration-300', className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ children, className }) {
  return (
    <div className={cn('flex items-center justify-between mb-3', className)}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className }) {
  return (
    <h3 className={cn('text-[13px] font-semibold text-stone-800', className)}>
      {children}
    </h3>
  )
}

/* ── StatCard ────────────────────────────────────────── */
export function StatCard({ label, value, delta, deltaUp = true, accent = '#0F6E56' }) {
  return (
    <div className="bg-white rounded-xl border border-stone-200 p-4 select-none cursor-default">
      <p className="text-[11px] uppercase tracking-wider text-stone-400 mb-1.5">{label}</p>
      <p className="font-bold text-3xl leading-none mb-1 select-none cursor-default" style={{ color: accent }}>
        {value}
      </p>
      {delta && (
        <p className={cn('text-[11px] flex items-center gap-1', deltaUp ? 'text-emerald-600' : 'text-red-500')}>
          {deltaUp ? '↑' : '↓'} {delta}
        </p>
      )}
    </div>
  )
}

/* ── Avatar ──────────────────────────────────────────── */
export function Avatar({ url, initials, size = 'md', className }) {
  const sizeMap = {
    sm: 'w-6 h-6 text-[10px]',
    md: 'w-8 h-8 text-[11px]',
    lg: 'w-10 h-10 text-sm',
  }
  return (
    <div
      className={cn(
        'rounded-full bg-[--teal-light] flex items-center justify-center font-semibold text-[--teal] flex-shrink-0 overflow-hidden',
        sizeMap[size],
        className
      )}
    >
      {url ? (
        <img src={url} alt={initials} className="w-full h-full object-cover" />
      ) : (
        initials
      )}
    </div>
  )
}

/* ── OccupancyBar ────────────────────────────────────── */
export function OccupancyBar({ label, value, color = '#1D9E75', max = 100 }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="mb-2">
      <div className="flex justify-between text-[11px] text-stone-500 mb-1">
        <span>{label}</span>
        <span className="font-medium text-stone-700">{value}{typeof max === 'number' && max !== 100 ? `/${max}` : '%'}</span>
      </div>
      <div className="h-1.5 bg-stone-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}

/* ── StarRating ──────────────────────────────────────── */
export function StarRating({ rating, size = 12 }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <svg
          key={i}
          width={size}
          height={size}
          viewBox="0 0 24 24"
          fill={i <= Math.floor(rating) ? '#BA7517' : i - 0.5 <= rating ? 'url(#half)' : 'none'}
          stroke="#BA7517"
          strokeWidth="2"
        >
          <defs>
            <linearGradient id="half">
              <stop offset="50%" stopColor="#BA7517" />
              <stop offset="50%" stopColor="transparent" />
            </linearGradient>
          </defs>
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  )
}

/* ── Input ───────────────────────────────────────────── */
export function Input({ className, ...props }) {
  return (
    <input
      className={cn(
        'w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white',
        'placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400',
        'transition-all duration-150',
        className
      )}
      {...props}
    />
  )
}

/* ── Select ──────────────────────────────────────────── */
export function Select({ className, children, ...props }) {
  return (
    <select
      className={cn(
        'w-full px-3 py-2 text-sm rounded-lg border border-stone-200 bg-white',
        'focus:outline-none focus:ring-2 focus:ring-teal-400/30 focus:border-teal-400',
        'transition-all duration-150 text-stone-700',
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
}

/* ── FilterChip ──────────────────────────────────────── */
export function FilterChip({ label, count, active, onClick, color = 'teal', className }) {
  const activeStyles = {
    teal:    'bg-[#0F6E56] dark:bg-[#1D9E75] text-white border-[#0F6E56] dark:border-[#1D9E75]',
    emerald: 'bg-emerald-600 dark:bg-emerald-500 text-white border-emerald-600 dark:border-emerald-500',
    amber:   'bg-[#BA7517] dark:bg-[#D97706] text-white border-[#BA7517] dark:border-[#D97706]',
    purple:  'bg-[#534AB7] dark:bg-[#7C3AED] text-white border-[#534AB7] dark:border-[#7C3AED]',
    rose:    'bg-rose-600 dark:bg-rose-500 text-white border-rose-600 dark:border-rose-500',
    blue:    'bg-blue-600 dark:bg-blue-500 text-white border-blue-600 dark:border-blue-500',
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'px-2.5 sm:px-3 py-1.5 rounded-full text-[10px] sm:text-[11px] font-semibold border transition-all duration-150 flex items-center gap-1.5 shadow-sm select-none',
        active
          ? (activeStyles[color] || activeStyles.teal)
          : 'bg-white dark:bg-stone-800/80 text-stone-600 dark:text-stone-300 border-stone-200 dark:border-white/10 hover:border-stone-300 dark:hover:border-white/20 hover:text-stone-900 dark:hover:text-white',
        className
      )}
    >
      <span>{label}</span>
      {count !== undefined && (
        <span
          className={cn(
            'px-1.5 py-0.5 rounded-full text-[9px] font-bold leading-none',
            active
              ? 'bg-white/25 text-white'
              : 'bg-stone-100 dark:bg-white/10 text-stone-500 dark:text-stone-400'
          )}
        >
          {count}
        </span>
      )}
    </button>
  )
}
