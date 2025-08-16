import { useToastContext } from './ToastProvider'
import { ToastOptions } from './toast.types'

/**
 * Hook to access the toast system
 * 
 * @example
 * ```tsx
 * const { toast } = useToast()
 * 
 * // Basic usage
 * toast({ title: 'Success!', variant: 'success' })
 * 
 * // With action
 * toast({
 *   title: 'File saved',
 *   description: 'Your changes have been preserved',
 *   variant: 'success',
 *   action: {
 *     label: 'Undo',
 *     onClick: () => revertChanges()
 *   }
 * })
 * 
 * // Custom placement and duration
 * toast({
 *   title: 'Warning',
 *   description: 'This action cannot be undone',
 *   variant: 'warning',
 *   placement: 'bottom-center',
 *   duration: 0 // Persist until manually closed
 * })
 * ```
 */
export const useToast = () => {
  const context = useToastContext()
  
  return {
    /**
     * Display a new toast notification
     * @param options Toast configuration options
     * @returns The generated toast ID
     */
    toast: (options: ToastOptions) => context.toast(options),
    
    /**
     * Dismiss a specific toast by ID
     * @param id The toast ID to dismiss
     */
    dismiss: context.dismiss,
    
    /**
     * Array of all currently active toasts
     */
    toasts: context.toasts
  }
}