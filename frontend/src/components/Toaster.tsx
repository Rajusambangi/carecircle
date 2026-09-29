import { CircleCheck, Info, TriangleAlert, X } from 'lucide-react'
import { type ReactNode, useCallback, useMemo, useState } from 'react'

import { ToastContext, type ToastTone } from '../lib/toast'

interface Toast {
  id: number
  message: string
  tone: ToastTone
}

const STYLES: Record<ToastTone, { icon: typeof Info; color: string }> = {
  success: { icon: CircleCheck, color: 'text-brand-600' },
  info: { icon: Info, color: 'text-sky-600' },
  warning: { icon: TriangleAlert, color: 'text-amber-600' },
}

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const dismiss = useCallback((id: number) => {
    setToasts((all) => all.filter((t) => t.id !== id))
  }, [])

  const show = useCallback(
    (message: string, tone: ToastTone = 'success') => {
      const id = nextId++
      setToasts((all) => [...all.slice(-2), { id, message, tone }])
      setTimeout(() => dismiss(id), 4000)
    },
    [dismiss],
  )

  const api = useMemo(() => ({ show }), [show])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="no-print pointer-events-none fixed top-24 right-6 z-50 flex w-96 flex-col gap-3">
        {toasts.map((t) => {
          const { icon: Icon, color } = STYLES[t.tone]
          return (
            <div
              key={t.id}
              role="status"
              className="pointer-events-auto flex animate-slide-in items-start gap-3 rounded-2xl border border-stone-200 bg-white/95 px-4 py-3 shadow-xl backdrop-blur"
            >
              <Icon className={`mt-0.5 h-6 w-6 shrink-0 ${color}`} />
              <p className="flex-1 text-base text-stone-800">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                aria-label="Dismiss"
                className="text-stone-400 transition hover:rotate-90 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
