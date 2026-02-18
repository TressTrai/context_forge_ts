/**
 * ScaleFeedback — press/hover scale on interactive elements.
 *
 * Usage:
 *   <ScaleFeedback>
 *     <Button>Click me</Button>
 *   </ScaleFeedback>
 *
 *   <ScaleFeedback preset="icon">
 *     <IconButton />
 *   </ScaleFeedback>
 */

import { motion } from "framer-motion"
import { scaleFeedback } from "@/lib/motion"
import type { ReactNode } from "react"

interface ScaleFeedbackProps {
  children: ReactNode
  className?: string
  preset?: keyof typeof scaleFeedback
  disabled?: boolean
}

export function ScaleFeedback({
  children,
  className,
  preset = "button",
  disabled = false,
}: ScaleFeedbackProps) {
  const config = scaleFeedback[preset]

  if (disabled) {
    return <div className={className}>{children}</div>
  }

  return (
    <motion.div
      className={className}
      whileTap={config.whileTap}
      whileHover={config.whileHover}
      transition={config.transition}
    >
      {children}
    </motion.div>
  )
}
