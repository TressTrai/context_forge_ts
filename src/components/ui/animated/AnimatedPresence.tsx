/**
 * AnimatedPresence — drop-in wrapper for conditional rendering with enter/exit.
 *
 * Usage:
 *   <AnimatedItem show={isVisible}>
 *     <MyComponent />
 *   </AnimatedItem>
 */

import { AnimatePresence, motion } from "framer-motion"
import { springs } from "@/lib/motion"
import type { ReactNode } from "react"

interface AnimatedItemProps {
  show: boolean
  children: ReactNode
  className?: string
}

export function AnimatedItem({
  show,
  children,
  className,
}: AnimatedItemProps) {
  return (
    <AnimatePresence mode="wait">
      {show && (
        <motion.div
          className={className}
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={springs.smooth}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
