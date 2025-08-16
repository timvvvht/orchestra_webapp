import React, { useEffect, useRef } from 'react'
import {
  CheckCircle,
  Info,
  AlertTriangle,
  XCircle,
  X as Close
} from 'lucide-react'
import { ToastInternal } from './toast.types'
import { cn } from '@/lib/utils'

interface Props {
  toast: ToastInternal
  dismiss: (id: string) => void
  updateAnimationState: (id: string, state: 'entering' | 'visible' | 'exiting') => void
}

const VARIANT_STYLES = {
  default: {
    bg: 'bg-white/[0.03] border-white/[0.08]',
    accentBar: 'bg-blue-primary/60',
    icon: <Info className="w-4 h-4 text-white/60" />
  },
  success: {
    bg: 'bg-emerald-success border-white/[0.08]',
    accentBar: 'bg-emerald-400/80',
    icon: <CheckCircle className="w-4 h-4 text-emerald-400" />
  },
  warning: {
    bg: 'bg-amber-warning border-white/[0.08]',
    accentBar: 'bg-amber-400/80',
    icon: <AlertTriangle className="w-4 h-4 text-amber-400" />
  },
  error: {
    bg: 'bg-red-danger border-white/[0.08]',
    accentBar: 'bg-red-400/80',
    icon: <XCircle className="w-4 h-4 text-red-400" />
  }
} as const

const ToastCard: React.FC<Props> = ({ toast, dismiss, updateAnimationState }) => {
  const { 
    id, 
    title, 
    description, 
    variant = 'default', 
    duration = 4000,
    animationState
  } = toast

  const timeoutRef = useRef<NodeJS.Timeout>()
  const animationTimeoutRef = useRef<NodeJS.Timeout>()

  // Auto-dismiss logic
  useEffect(() => {
    if (duration === 0 || animationState !== 'visible') return

    timeoutRef.current = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [duration, animationState, id])

  // Animation lifecycle management
  useEffect(() => {
    if (animationState === 'entering') {
      // Trigger visible state after a brief delay
      animationTimeoutRef.current = setTimeout(() => {
        updateAnimationState(id, 'visible')
      }, 10)
    }

    return () => {
      if (animationTimeoutRef.current) {
        clearTimeout(animationTimeoutRef.current)
      }
    }
  }, [animationState, id, updateAnimationState])

  const handleDismiss = () => {
    // Clear auto-dismiss timer
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }

    // Start exit animation
    updateAnimationState(id, 'exiting')

    // Remove from DOM after animation completes
    setTimeout(() => {
      dismiss(id)
    }, 200) // Match CSS animation duration
  }

  const { bg, accentBar, icon } = VARIANT_STYLES[variant]

  return (
    <div
      className={cn(
        'toast-card pointer-events-auto relative flex w-full overflow-hidden rounded-lg border p-4 backdrop-blur-xl',
        bg,
        `toast-${animationState}`
      )}
    >
      {/* Gradient overlay for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />

      {/* Accent glow bar */}
      <div
        className={cn(
          'toast-accent-bar absolute left-0 top-0 h-full w-1',
          accentBar
        )}
      />

      {/* Content */}
      <div className="ml-2 flex flex-1 flex-col gap-0.5 relative z-10">
        <div className="flex items-start gap-2">
          {/* Icon */}
          <div className="mt-0.5 flex-shrink-0">
            {toast.icon ?? icon}
          </div>

          {/* Text content */}
          <div className="flex flex-col min-w-0 flex-1">
            {title && (
              <div className="text-sm font-medium text-white/90 leading-tight">
                {title}
              </div>
            )}
            {description && (
              <div className="text-xs text-white/60 leading-relaxed mt-0.5">
                {description}
              </div>
            )}
          </div>
        </div>

        {/* Optional action button */}
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.onClick()
              handleDismiss()
            }}
            className="
              mt-2 self-start rounded-md bg-white/10 px-2 py-1 
              text-xs text-white/80 hover:bg-white/20 
              transition-all duration-200 hover:scale-105
              border border-white/10 hover:border-white/20
            "
          >
            {toast.action.label}
          </button>
        )}
      </div>

      {/* Close button */}
      <button
        onClick={handleDismiss}
        className="
          absolute right-2 top-2 text-white/40 hover:text-white/70 
          transition-all duration-200 hover:scale-110 p-1 rounded
          hover:bg-white/10
        "
      >
        <Close className="h-3 w-3" />
      </button>
    </div>
  )
}

export default ToastCard