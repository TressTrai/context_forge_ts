/**
 * Hook to prevent accidental multiple button clicks.
 * Returns a debounced click handler that disables the button for a short period after click.
 */

import { useState, useCallback, useRef } from "react"

interface UseButtonDebounceOptions {
  delay?: number // Delay in milliseconds (default: 500ms)
}

export function useButtonDebounce(options: UseButtonDebounceOptions = {}) {
  const { delay = 500 } = options
  const [isDebouncing, setIsDebouncing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const debounce = useCallback(
    <T extends (...args: any[]) => any>(fn: T) => {
      return (...args: Parameters<T>) => {
        if (isDebouncing) return

        setIsDebouncing(true)
        fn(...args)

        // Clear existing timeout
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current)
        }

        // Set new timeout
        timeoutRef.current = setTimeout(() => {
          setIsDebouncing(false)
        }, delay)
      }
    },
    [isDebouncing, delay]
  )

  return {
    isDebouncing,
    debounce,
  }
}
