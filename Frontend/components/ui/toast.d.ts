import * as React from "react"

export type ToastProps = {
  variant?: "default" | "destructive"
  open?: boolean
  onOpenChange?: (open: boolean) => void
  title?: string
  description?: string
}

export type ToastActionElement = React.ReactElement 