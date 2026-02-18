/**
 * AnimatedList — staggered enter/exit for lists of items.
 *
 * Usage:
 *   <AnimatedList>
 *     {items.map(item => (
 *       <AnimatedListItem key={item.id}>
 *         <MyItem />
 *       </AnimatedListItem>
 *     ))}
 *   </AnimatedList>
 */

import { AnimatePresence, motion } from "framer-motion"
import { listVariants, listItemVariants } from "@/lib/motion"
import type { ReactNode } from "react"

interface AnimatedListProps {
  children: ReactNode
  className?: string
}

export function AnimatedList({ children, className }: AnimatedListProps) {
  return (
    <motion.div
      className={className}
      variants={listVariants}
      initial="hidden"
      animate="visible"
    >
      <AnimatePresence mode="popLayout">
        {children}
      </AnimatePresence>
    </motion.div>
  )
}

interface AnimatedListItemProps {
  children: ReactNode
  className?: string
  layoutId?: string
}

export function AnimatedListItem({
  children,
  className,
  layoutId,
}: AnimatedListItemProps) {
  return (
    <motion.div
      className={className}
      variants={listItemVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      layoutId={layoutId}
    >
      {children}
    </motion.div>
  )
}
