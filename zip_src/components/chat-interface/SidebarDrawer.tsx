import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import { useReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Mobile drawer component that wraps ChatSidebar
 * Provides hamburger menu trigger and slide-in drawer functionality
 */
export function SidebarDrawer() {
  const [open, setOpen] = useState(false);
  const prefersReducedMotion = useReducedMotion();

  // Animation variants - disabled if user prefers reduced motion
  const drawerVariants = prefersReducedMotion ? {} : {
    initial: { x: -300 },
    animate: { x: 0 },
    exit: { x: -300 }
  };

  const scrimVariants = prefersReducedMotion ? {} : {
    initial: { opacity: 0 },
    animate: { opacity: 0.5 },
    exit: { opacity: 0 }
  };

  return (
    <>
      {/* Hamburger Menu Button */}
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 md:hidden p-2 rounded-lg bg-white/5 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors"
        aria-label="Open navigation menu"
      >
        <Menu className="text-white w-5 h-5" />
      </button>

      {/* Drawer Overlay */}
      <AnimatePresence>
        {open && (
          <>
            {/* Background Scrim */}
            <motion.div
              key="scrim"
              {...scrimVariants}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 bg-black z-40"
            />

            {/* Drawer Panel */}
            <motion.aside
              key="drawer"
              {...drawerVariants}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-[80vw] max-w-[320px] bg-gray-900/95 backdrop-blur-lg overflow-y-auto border-r border-white/10"
            >
              {/* Close Button */}
              <div className="absolute top-4 right-4 z-10">
                <button
                  onClick={() => setOpen(false)}
                  className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                  aria-label="Close navigation menu"
                >
                  <X className="text-white w-4 h-4" />
                </button>
              </div>

              {/* Sidebar Content */}
              <ChatSidebar 
                selectedAgentId={null} // Will be managed by parent context
                collapsed={false} 
                onToggleCollapse={() => {}} // Not used in mobile mode
                mobile={true}
                onClose={() => setOpen(false)}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}