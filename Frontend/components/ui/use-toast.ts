// Re-export the useToast hook from toast-primitive
import { useToast } from "@/components/ui/toast-primitive";
import type { ToastActionElement, ToastProps } from "@/components/ui/toast-primitive";

export type Toast = {
  id?: string
  title?: string
  description?: string
  action?: ToastActionElement
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export { useToast, ToastActionElement, ToastProps }; 