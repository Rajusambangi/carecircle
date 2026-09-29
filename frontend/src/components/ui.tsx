import { Brain, Siren, TriangleAlert } from 'lucide-react'
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useState } from 'react'
import Markdown from 'react-markdown'

import { formatDate } from '../lib/format'
import type { SafetyAlert, Source } from '../types'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`animate-fade-up rounded-3xl border border-stone-200/80 bg-white/90 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-md ${className}`}
    >
      {children}
    </div>
  )
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  loading?: boolean
}

export function Button({
  variant = 'primary',
  loading = false,
  children,
  className = '',
  disabled,
  ...rest
}: ButtonProps) {
  const styles =
    variant === 'primary'
      ? 'bg-brand-600 text-white shadow-sm shadow-brand-600/30 hover:bg-brand-700 hover:shadow-md hover:-translate-y-0.5 disabled:bg-stone-300 disabled:shadow-none disabled:translate-y-0'
      : 'bg-transparent text-stone-600 hover:bg-stone-100 disabled:text-stone-300'
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-base font-medium transition-all duration-200 active:scale-95 ${styles} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner />}
      {children}
    </button>
  )
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  )
}

/** "Searching memory…" indicator with a breathing brain and bouncing dots. */
export function Thinking({ label = 'Searching memory' }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-brand-700" role="status">
      <Brain className="h-7 w-7 animate-breathe" />
      <span className="text-base font-medium">{label}</span>
      <span className="flex gap-1">
        {[0, 150, 300].map((d) => (
          <span
            key={d}
            className="h-2 w-2 animate-dot rounded-full bg-brand-500"
            style={{ animationDelay: `${d}ms` }}
          />
        ))}
      </span>
    </div>
  )
}

export function Skeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="mt-4 space-y-3" aria-hidden>
      {Array.from({ length: lines }, (_, i) => (
        <div key={i} className="skeleton h-4" style={{ width: `${90 - ((i * 17) % 35)}%` }} />
      ))}
    </div>
  )
}

export function ErrorBox({ message }: { message: string }) {
  return (
    <div
      role="alert"
      className="flex animate-fade-up items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-base text-red-700"
    >
      <TriangleAlert className="mt-0.5 h-6 w-6 shrink-0" />
      <span>{message}</span>
    </div>
  )
}

export function EmergencyBanner({ alert }: { alert: SafetyAlert }) {
  return (
    <div
      role="alert"
      className="flex animate-shake items-start gap-4 rounded-2xl border-2 border-red-500 bg-red-600 px-5 py-4 text-white shadow-lg shadow-red-600/30"
    >
      <Siren className="h-9 w-9 shrink-0 animate-pulse" />
      <div>
        <p className="text-lg font-bold">Call 112 now</p>
        <p className="text-base text-red-50">{alert.message}</p>
      </div>
    </div>
  )
}

const TONES = {
  stone: 'bg-stone-100 text-stone-600',
  brand: 'bg-brand-100 text-brand-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
} as const

export function Badge({
  children,
  tone = 'stone',
}: {
  children: ReactNode
  tone?: keyof typeof TONES
}) {
  return (
    <span
      className={`inline-flex animate-pop items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}

export function MarkdownText({ children }: { children: string }) {
  return (
    <div className="prose-care animate-fade-in text-base leading-relaxed">
      <Markdown>{children}</Markdown>
    </div>
  )
}

/** Animates from 0 to `value` — used for the memory counter. */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.round(value * (1 - Math.pow(1 - t, 3))))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value, duration])
  return <>{shown}</>
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <details className="group mt-5 text-base">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-stone-500 hover:text-brand-700">
        <Brain className="h-5 w-5" />
        Based on {sources.length} memories
        <span className="transition-transform group-open:rotate-90">›</span>
      </summary>
      <ul className="stagger mt-3 space-y-2">
        {sources.map((s, i) => (
          <li key={i} className="rounded-xl border-l-4 border-brand-200 bg-stone-50 px-4 py-2.5">
            <span className="mr-2 text-sm font-semibold text-brand-700">{formatDate(s.date)}</span>
            {s.text}
          </li>
        ))}
      </ul>
    </details>
  )
}
