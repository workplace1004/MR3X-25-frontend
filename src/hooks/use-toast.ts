// Re-export toast from sonner for compatibility
import { toast } from 'sonner'

// Simple hook that returns an empty toasts array and toast function
// This is for compatibility with components that expect the old toast API
export function useToast() {
  return {
    toasts: [] as any[],
    toast,
    dismiss: (toastId?: string) => {
      if (toastId) {
        toast.dismiss(toastId)
      } else {
        toast.dismiss()
      }
    },
  }
}

export { toast }
