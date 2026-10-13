import { useEffect } from 'react'

let lockCount = 0
let originalBodyOverflow = ''
let originalMainOverflow = ''

export function lockScroll() {
  if (typeof document === 'undefined') return
  if (lockCount === 0) {
    originalBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add('modal-open')

    // In SmartStay AppLayout, the scrollbar lives on <main>, not <body>!
    const mainEl = document.querySelector('main')
    if (mainEl) {
      originalMainOverflow = mainEl.style.overflow
      mainEl.style.overflow = 'hidden'
    }
  }
  lockCount++
}

export function unlockScroll() {
  if (typeof document === 'undefined') return
  lockCount = Math.max(0, lockCount - 1)
  if (lockCount === 0) {
    document.body.style.overflow = originalBodyOverflow || ''
    document.body.classList.remove('modal-open')

    const mainEl = document.querySelector('main')
    if (mainEl) {
      mainEl.style.overflow = originalMainOverflow || ''
    }
  }
}

/**
 * Hook to lock both body and <main> scroll when a modal or viewer is open.
 * Supports nesting (e.g. image zoom inside room modal) via reference counting.
 * @param {boolean} lock Whether scroll should currently be locked.
 */
export function useScrollLock(lock = true) {
  useEffect(() => {
    if (!lock) return
    lockScroll()
    return () => {
      unlockScroll()
    }
  }, [lock])
}

export default useScrollLock
