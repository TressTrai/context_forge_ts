/**
 * Button component with built-in debouncing to prevent accidental multiple clicks.
 * Use this for critical actions like delete, save, submit, etc.
 */

import { useState, useCallback, useRef } from "react"
import { Button, type ButtonProps } from "./button"

interface DebouncedButtonProps extends ButtonProps {
  debounceMs?: number
}

export function DebouncedButton({
  onClick,
  disabled,
  debounceMs = 500,
  children,
  ...props
}: DebouncedButtonProps) {
  const [isDebouncing, setIsDebouncing] = useState(false)
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLButtonElement>) => {
      const buttonType = (e.currentTarget as HTMLButtonElement).type
      console.log('[DebouncedButton] Click:', {
        type: buttonType,
        isDebouncing,
        disabled,
        hasOnClick: !!onClick,
        target: e.currentTarget
      })

      // Prevent action if already debouncing
      if (isDebouncing) {
        console.log('[DebouncedButton] Prevented - already debouncing')
        e.preventDefault()
        e.stopPropagation()
        return
      }

      // Call the original onClick handler if provided
      // For type="submit" buttons without onClick, this does nothing
      // and allows the default form submission to proceed
      if (onClick) {
        console.log('[DebouncedButton] Calling onClick handler')
        onClick(e)
      } else {
        console.log('[DebouncedButton] No onClick handler, allowing default behavior')
      }

      // Start debounce period
      setIsDebouncing(true)

      // Clear existing timeout
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }

      // Set new timeout
      timeoutRef.current = setTimeout(() => {
        console.log('[DebouncedButton] Debounce period ended')
        setIsDebouncing(false)
      }, debounceMs)
    },
    [onClick, disabled, isDebouncing, debounceMs]
  )

  return (
    <Button
      {...props}
      onClick={handleClick}
      disabled={disabled || isDebouncing}
    >
      {children}
    </Button>
  )
}
