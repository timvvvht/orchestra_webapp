import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface MicroToastProps {
  /** Current status of the toast */
  status: 'idle' | 'success' | 'error';
  /** Type of action for contextual messaging */
  type: 'copy' | 'save' | 'delete' | 'create' | 'update' | 'generic';
  /** Custom message override */
  message?: string;
  /** Position relative to trigger element */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional CSS classes */
  className?: string;
  /** Force left alignment to prevent window overflow */
  forceLeftAlign?: boolean;
}

/**
 * MicroToast - Mystical, glassmorphic micro-notification
 * 
 * A reverent, minimal notification that materializes near its trigger,
 * embodying Orchestra's mystical minimalism with water-inspired motion
 * and ethereal glassmorphic styling.
 * 
 * @example
 * ```tsx
 * const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
 * 
 * const handleAction = async () => {
 *   try {
 *     await performAction();
 *     setStatus('success');
 *     setTimeout(() => setStatus('idle'), 2000);
 *   } catch {
 *     setStatus('error');
 *     setTimeout(() => setStatus('idle'), 2000);
 *   }
 * };
 * 
 * return (
 *   <div className="relative">
 *     <button onClick={handleAction}>Action</button>
 *     <MicroToast status={status} type="copy" />
 *   </div>
 * );
 * ```
 */
export const MicroToast: React.FC<MicroToastProps> = ({
  status,
  type,
  message,
  position = 'top',
  className,
  forceLeftAlign = false
}) => {
  if (status === 'idle') return null;

  const isSuccess = status === 'success';
  const isError = status === 'error';

  // Contextual messaging based on type and status
  const getDefaultMessage = () => {
    if (message) return message;
    
    const messages = {
      copy: isSuccess ? 'Copied!' : 'Copy failed',
      save: isSuccess ? 'Saved!' : 'Save failed', 
      delete: isSuccess ? 'Deleted!' : 'Delete failed',
      create: isSuccess ? 'Created!' : 'Create failed',
      update: isSuccess ? 'Updated!' : 'Update failed',
      generic: isSuccess ? 'Success!' : 'Failed'
    };
    
    return messages[type] || messages.generic;
  };

  // Position-based styling with window-aware positioning
  const getPositionClasses = () => {
    // For long messages (like save paths), use left-aligned positioning to prevent overflow
    if (forceLeftAlign || (message && message.length > 20)) {
      const leftAlignedPositions = {
        top: '-top-10 left-0 translate-x-0',
        bottom: '-bottom-10 left-0 translate-x-0', 
        left: '-left-32 top-1/2 -translate-y-1/2',
        right: '-right-32 top-1/2 -translate-y-1/2'
      };
      return leftAlignedPositions[position];
    }
    
    // Default centered positioning for short messages
    const positions = {
      top: '-top-10 left-1/3 -translate-x-1/2',
      bottom: '-bottom-10 left-1/3 -translate-x-1/2', 
      left: '-left-32 top-1/2 -translate-y-1/2',
      right: '-right-32 top-1/2 -translate-y-1/2'
    };
    return positions[position];
  };

  // Arrow component for directional pointing
  const Arrow = () => {
    // Adjust arrow position based on toast alignment
    const isLeftAligned = forceLeftAlign || (message && message.length > 20);
    
    const arrowClasses = {
      top: isLeftAligned ? 'left-6 top-full -translate-x-1/2 rotate-0' : 'left-2/3 top-full -translate-x-1/2 rotate-0',
      bottom: isLeftAligned ? 'left-6 -top-1 -translate-x-1/2 rotate-180' : 'left-2/3 -top-1 -translate-x-1/2 rotate-180',
      left: '-right-1 top-1/2 -translate-y-1/2 rotate-90',
      right: '-left-1 top-1/2 -translate-y-1/2 -rotate-90'
    };

    return (
      <div className={cn('absolute', arrowClasses[position])}>
        <svg width="8" height="4" viewBox="0 0 8 4" className="drop-shadow-sm">
          <polygon 
            points="4,0 8,4 0,4" 
            fill="rgba(255,255,255,0.08)"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="0.5"
          />
        </svg>
      </div>
    );
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ 
          opacity: 0, 
          scale: 0.88, 
          y: position === 'top' ? 8 : position === 'bottom' ? -8 : 0,
          x: position === 'left' ? 8 : position === 'right' ? -8 : 0,
          filter: 'blur(4px)'
        }}
        animate={{ 
          opacity: 1, 
          scale: 1, 
          y: 0,
          x: 0,
          filter: 'blur(0px)'
        }}
        exit={{ 
          opacity: 0, 
          scale: 0.92, 
          y: position === 'top' ? 4 : position === 'bottom' ? -4 : 0,
          x: position === 'left' ? 4 : position === 'right' ? -4 : 0,
          filter: 'blur(2px)'
        }}
        transition={{
          duration: 0.45,
          ease: [0.16, 1, 0.3, 1], // Water-inspired easing
        }}
        className={cn(
          // Base positioning
          'absolute z-30 pointer-events-none',
          getPositionClasses(),
          
          // Core glassmorphic styling
          'px-3 py-1.5',
          'rounded-full',
          'backdrop-blur-xl',
          'border',
          
          // Glass background with subtle gradient
          'bg-white/[0.03]',
          'bg-gradient-to-br from-white/[0.08] to-transparent',
          
          // Border and ring effects
          'border-white/10',
          'ring-1 ring-inset ring-white/5',
          
          // Layout
          'flex items-center gap-2',
          // Prevent extra-long paths from spilling horizontally
          // Allow wrapping at slashes & dashes, with a max width
          'max-w-[80vw] break-words',
          // Keep "nowrap" only on really short messages
          !(message && message.length > 28) && 'whitespace-nowrap',
          
          // Success state styling
          isSuccess && [
            'shadow-[0_0_24px_rgba(16,185,129,0.15)]',
            'border-emerald-400/20',
          ],
          
          // Error state styling  
          isError && [
            'shadow-[0_0_24px_rgba(239,68,68,0.15)]',
            'border-red-400/20',
          ],
          
          className
        )}
        style={{
          // Dynamic glow based on state
          boxShadow: isSuccess 
            ? '0 0 32px 2px rgba(16,185,129,0.12), 0 0 8px rgba(16,185,129,0.2)'
            : '0 0 32px 2px rgba(239,68,68,0.12), 0 0 8px rgba(239,68,68,0.2)'
        }}
      >
        {/* Mystical status indicator dot */}
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.3 }}
          className={cn(
            'w-1.5 h-1.5 rounded-full flex-shrink-0',
            isSuccess && 'bg-emerald-400/90 shadow-[0_0_8px_rgba(16,185,129,0.4)]',
            isError && 'bg-red-400/90 shadow-[0_0_8px_rgba(239,68,68,0.4)]'
          )}
        />
        
        {/* Sacred typography */}
        <motion.span
          initial={{ opacity: 0, x: -4 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.3 }}
          className={cn(
            // Typography scale from design system
            'text-xs font-medium',
            'tracking-wide',
            'text-white/90',
            
            // Ethereal text shadow
            'drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]',
            
            // Subtle text glow
            isSuccess && 'text-shadow-[0_0_8px_rgba(16,185,129,0.3)]',
            isError && 'text-shadow-[0_0_8px_rgba(239,68,68,0.3)]'
          )}
        >
          {getDefaultMessage()}
        </motion.span>
        
        {/* Directional arrow */}
        <Arrow />
        
        {/* Subtle inner highlight */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />
      </motion.div>
    </AnimatePresence>
  );
};

export default MicroToast;