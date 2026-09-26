import React from 'react'
import { cn } from '@/lib/utils'

/**
 * SmartStayLogo Component
 * 
 * Automatically adapts between Light and Dark mode using pure CSS switching.
 * 
 * Props:
 * - variant: 'full' | 'icon' | 'horizontal' (default: 'full')
 * - size: 'xs' | 'sm' | 'md' | 'lg' | 'xl' (default: 'md')
 * - className: additional wrapper classes
 * - imgClassName: additional classes applied to the img element
 * - showBadge: boolean (shows Batanes badge for horizontal mode)
 */
export default function SmartStayLogo({
  variant = 'full',
  size = 'md',
  className = '',
  imgClassName = '',
  showBadge = false,
  ...props
}) {
  // Size presets for 'full'
  const fullSizeMap = {
    xs: 'h-14 w-auto',
    sm: 'h-20 w-auto',
    md: 'h-28 w-auto',
    lg: 'h-36 w-auto',
    xl: 'h-48 w-auto',
  }

  // Size presets for 'icon'
  const iconSizeMap = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }

  // Size presets for 'horizontal'
  const horizIconMap = {
    xs: 'w-5 h-5',
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16',
  }

  const horizTextMap = {
    xs: 'text-sm',
    sm: 'text-base',
    md: 'text-xl',
    lg: 'text-2xl',
    xl: 'text-3xl',
  }

  if (variant === 'icon') {
    return (
      <img
        src="/logo-icon.png"
        alt="SmartStay"
        className={cn('object-contain select-none', iconSizeMap[size] || iconSizeMap.md, imgClassName, className)}
        {...props}
      />
    )
  }

  if (variant === 'horizontal') {
    return (
      <div className={cn('flex items-center gap-2.5 select-none', className)} {...props}>
        <img
          src="/logo-icon.png"
          alt=""
          className={cn('object-contain flex-shrink-0 drop-shadow-sm', horizIconMap[size] || horizIconMap.md, imgClassName)}
        />
        <div className="flex items-center gap-1.5 leading-none">
          <span className={cn('font-extrabold tracking-tight text-stone-900 dark:text-white', horizTextMap[size] || horizTextMap.md)}>
            SmartStay
          </span>
          {showBadge && (
            <span className="text-[9px] uppercase font-bold tracking-widest px-1.5 py-0.5 rounded-full bg-teal-100 dark:bg-teal-500/20 text-teal-800 dark:text-teal-300 border border-teal-300 dark:border-teal-500/30">
              Batanes
            </span>
          )}
        </div>
      </div>
    )
  }

  // Default: 'full' stacked logo with automatic light/dark CSS switching
  return (
    <div className={cn('flex flex-col items-center justify-center select-none', className)} {...props}>
      {/* Light Mode: dark text */}
      <img
        src="/logo-light.png"
        alt="SmartStay"
        className={cn(
          'block dark:hidden object-contain transition-all duration-300 drop-shadow-sm',
          fullSizeMap[size] || fullSizeMap.md,
          imgClassName
        )}
      />
      {/* Dark Mode: crisp white text */}
      <img
        src="/logo-dark.png"
        alt="SmartStay"
        className={cn(
          'hidden dark:block object-contain transition-all duration-300 drop-shadow-md',
          fullSizeMap[size] || fullSizeMap.md,
          imgClassName
        )}
      />
    </div>
  )
}
