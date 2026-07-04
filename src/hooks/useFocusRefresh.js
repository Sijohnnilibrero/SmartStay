import { useEffect, useCallback, useRef } from 'react'

export function useFocusRefresh(fetchFn, deps) {
  var isVisibleRef = useRef(true)
  var depsRef = useRef(deps)
  depsRef.current = deps

  var refresh = useCallback(function() {
    if (fetchFn) fetchFn(true)
  }, [fetchFn])

  useEffect(function() {
    refresh()
  }, deps)

  useEffect(function() {
    function handleFocus() {
      if (!isVisibleRef.current) {
        isVisibleRef.current = true
        refresh()
      }
    }
    function handleVisibility() {
      if (document.hidden) {
        isVisibleRef.current = false
      } else {
        isVisibleRef.current = false
        handleFocus()
      }
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return function() {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [refresh])
}
