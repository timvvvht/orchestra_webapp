/**
 * Toast hook for managing toast notifications
 * Stub implementation for web app - uses sonner instead of custom toast system
 */

import { toast } from 'sonner';

export interface Toast {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: 'default' | 'destructive';
}

export function useToast() {
  // Return empty toasts array since we're using sonner instead
  return {
    toasts: [] as Toast[],
    toast: (props: Omit<Toast, 'id'>) => {
      // Delegate to sonner
      if (props.variant === 'destructive') {
        toast.error(props.title || props.description || 'Error');
      } else {
        toast.success(props.title || props.description || 'Success');
      }
    },
    dismiss: (id?: string) => {
      // Sonner handles dismissal automatically
    }
  };
}