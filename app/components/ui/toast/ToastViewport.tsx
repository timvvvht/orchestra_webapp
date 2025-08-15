import React from 'react'
import { ToastInternal, ToastPlacement } from './toast.types'
import ToastCard from './ToastCard'

interface Props {
  placement: ToastPlacement
  toasts: ToastInternal[]
  dismiss: (id: string) => void
  updateAnimationState: (id: string, state: 'entering' | 'visible' | 'exiting') => void
}

const POSITION_CLASSES: Record<ToastPlacement, string> = {
  'top-left': 'top-4 left-4 items-start toast-viewport-top toast-viewport-left',
  'top-center': 'top-4 left-1/2 -translate-x-1/2 items-center toast-viewport-top toast-viewport-center',
  'top-right': 'top-4 right-4 items-end toast-viewport-top toast-viewport-right',
  'bottom-left': 'bottom-4 left-4 items-start toast-viewport-bottom toast-viewport-left',
  'bottom-center': 'bottom-4 left-1/2 -translate-x-1/2 items-center toast-viewport-bottom toast-viewport-center',
  'bottom-right': 'bottom-4 right-4 items-end toast-viewport-bottom toast-viewport-right'
}

const ToastViewport: React.FC<Props> = ({ 
  placement, 
  toasts, 
  dismiss, 
  updateAnimationState 
}) => {
  if (toasts.length === 0) return null

  return (
    <div
      className={`
        fixed z-[100] flex flex-col gap-2 pointer-events-none max-w-sm w-full
        ${POSITION_CLASSES[placement]}
      `}
    >
      {toasts.map(toast => (
        <ToastCard
          key={toast.id}
          toast={toast}
          dismiss={dismiss}
          updateAnimationState={updateAnimationState}
        />
      ))}
    </div>
  )
}

export default ToastViewport