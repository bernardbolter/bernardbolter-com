// AnimationWrapper.tsx
'use client'

import { AnimatePresence, motion, Variants } from "framer-motion";
import { usePathname } from "next/navigation";
import { ReactNode, useEffect } from 'react';

// 1. Rename and update the variants for a subtle opacity fade
const subtleFadeVariants: Variants = {
  // Page starts fully transparent (no scale applied)
  initial: { 
    opacity: 0, 
  },
  
  // Animates into view
  animate: { 
    opacity: 1, 
    transition: { 
      duration: 0.5, // Slightly slower entrance for smoothness
      ease: 'easeInOut' // Standard, reliable ease
    } 
  },
  
  // Exits by fading out
  exit: { 
    opacity: 0, 
    transition: { 
      duration: 0.2, // Quick exit is key for a non-jarring "wait" transition
      ease: 'easeOut' 
    } 
  },
};

export default function AnimationWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // Function to toggle body overflow
  const handleAnimationStart = () => {
    document.body.style.overflow = 'hidden';
  };

  const handleAnimationComplete = () => {
    // Only restore overflow when the new page is finished animating
    document.body.style.overflow = ''; 
  };

  useEffect(() => {
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  return (
    <AnimatePresence 
      mode="wait" // Ensures the old page fades out before the new one fades in
      onExitComplete={handleAnimationComplete}
    >
      <motion.div 
        key={pathname}
        variants={subtleFadeVariants} // 2. Use the new variants
        initial="initial"
        animate="animate"
        exit="exit"
        onAnimationStart={handleAnimationStart}
        onAnimationComplete={handleAnimationComplete} // This will fire once per animation cycle
        style={{ 
          // CRITICAL: Keep these styles for positioning and background integrity
          position: 'absolute', 
          width: '100%', 
          minHeight: '100vh',
          top: 0,
          left: 0,
          // IMPORTANT: Ensure this color matches the rest of your page background
          backgroundColor: 'var(--page-background-color, #FDFEFF)', 
          overflow: 'hidden', 
        }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}