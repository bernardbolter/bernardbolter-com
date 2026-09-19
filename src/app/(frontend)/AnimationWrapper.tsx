// AnimationWrapper.tsx
'use client'

import { AnimatePresence, motion, Variants } from 'framer-motion'
import { usePathname } from 'next/navigation'
import { ReactNode, useEffect, useRef } from 'react'

import { isArtworkDetailPath } from '@/lib/routes/isArtworkDetailPath'

const subtleFadeVariants: Variants = {
  initial: {
    opacity: 0,
  },
  animate: {
    opacity: 1,
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
  exit: {
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: 'easeOut',
    },
  },
}

export default function AnimationWrapper({
  children,
}: {
  children: ReactNode
}) {
  const pathname = usePathname()
  const isArtworkPage = isArtworkDetailPath(pathname)
  /** First paint must be visible without JS. Hydrating at opacity 0 hides the catalogue. */
  const isFirstPaint = useRef(true)

  useEffect(() => {
    isFirstPaint.current = false
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const handleAnimationStart = () => {
    if (isFirstPaint.current) return
    if (!isArtworkPage) {
      document.body.style.overflow = 'hidden'
    }
  }

  const handleAnimationComplete = () => {
    if (!isArtworkPage) {
      document.body.style.overflow = ''
    }
  }

  return (
    <AnimatePresence mode="wait" onExitComplete={handleAnimationComplete}>
      <motion.div
        key={pathname}
        variants={subtleFadeVariants}
        initial={false}
        animate="animate"
        exit="exit"
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete}
        style={{
          position: 'absolute',
          width: '100%',
          minHeight: '100vh',
          top: 0,
          left: 0,
          backgroundColor: 'var(--page-background-color, #FDFEFF)',
          overflow: isArtworkPage ? 'visible' : 'hidden',
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  )
}
