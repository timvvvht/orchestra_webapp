import React, { createContext, useCallback, useContext, useState } from 'react'
import { createPortal } from 'react-dom'
import { ToastInternal, ToastOptions, ToastPlacement } from './toast.types'
import ToastViewport from './ToastViewport'

type ToastContextType = {
  toast: (opts: ToastOptions) => string
  dismiss: (id: string) => void
  toasts: ToastInternal[]
}

const ToastContext = createContext<ToastContextType | null>(null)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [toasts, setToasts] = useState<ToastInternal[]>([])

  const generateId = () => {
    // Use crypto.randomUUID if available, fallback to timestamp + random
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID()
    }
    return `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  const toast = useCallback((opts: ToastOptions) => {
    const id = opts.id ?? generateId()
    const newToast: ToastInternal = {
      ...opts,
      id,
      createdAt: Date.now(),
      animationState: 'entering'
    }
    
    setToasts(prev => [...prev, newToast])
    return id
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const updateAnimationState = useCallback((id: string, state: 'entering' | 'visible' | 'exiting') => {
    setToasts(prev => prev.map(t => 
      t.id === id ? { ...t, animationState: state } : t
    ))
  }, [])

  // Group toasts by placement
  const toastsByPlacement = toasts.reduce((acc, toast) => {
    const placement = toast.placement ?? 'top-right'
    if (!acc[placement]) acc[placement] = []
    acc[placement].push(toast)
    return acc
  }, {} as Record<ToastPlacement, ToastInternal[]>)

  return (
    <ToastContext.Provider value={{ toast, dismiss, toasts }}>
      {children}
      {createPortal(
        <>
          {/* Render viewports for each placement that has toasts */}
          {(Object.entries(toastsByPlacement) as [ToastPlacement, ToastInternal[]][]).map(
            ([placement, placementToasts]) => (
              <ToastViewport
                key={placement}
                placement={placement}
                toasts={placementToasts}
                dismiss={dismiss}
                updateAnimationState={updateAnimationState}
              />
            )
          )}
        </>,
        document.body
      )}
    </ToastContext.Provider>
  )
}

export const useToastContext = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToastContext must be used within a ToastProvider')
  }
  return context
}