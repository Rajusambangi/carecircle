import { createContext, useContext } from 'react'

export type ToastTone = 'success' | 'info' | 'warning'

export interface ToastApi {
  show: (message: string, tone?: ToastTone) => void
}

export const ToastContext = createContext<ToastApi>({ show: () => {} })

export const useToast = () => useContext(ToastContext)
