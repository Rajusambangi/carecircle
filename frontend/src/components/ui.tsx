import { Brain, ShieldAlert, ShieldCheck, Siren, TriangleAlert } from 'lucide-react'
import { type ButtonHTMLAttributes, type ReactNode, useEffect, useRef, useState } from 'react'
import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

import { formatDate } from '../lib/format'
import type { DateCheck, SafetyAlert, Source } from '../types'

const MD_COMPONENTS: Components = {
  // Wide tables scroll inside their card instead of stretching it.
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-2xl border border-stone-200">
      <table>{children}</table>
    </div>
  ),
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  ),
}

/** Markdown with GitHub-flavoured extras (tables, strikethrough, task lists). */
function Md({ children }: { children: string }) {
  return (
    <Markdown remarkPlugins={[remarkGfm]} components={MD_COMPONENTS}>
      {children}
    </Markdown>
  )
}

/** Reveals markdown progressively, like a streamed reply, then renders it in full. */
export function StreamedMarkdown({ text, duration = 1400 }: { text: string; duration?: number }) {
  const [shown, setShown] = useState(0)
  useEffect(() => {
    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      setShown(Math.ceil(text.length * t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [text, duration])
  const done = shown >= text.length
  return (
    <div className="prose-care text-base leading-relaxed">
      <Md>{done ? text : text.slice(0, shown)}</Md>
      {!done && <span className="caret" aria-hidden />}
    </div>
  )
}

/** Fades children up the first time they scroll into view. */
export function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add('revealed')
          observer.disconnect()
        }
      },
      { rootMargin: '0px 0px -40px 0px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: ReactNode
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="group flex items-center gap-2.5 text-sm text-stone-600"
    >
      <span
        className={`relative h-6 w-11 rounded-full transition-colors duration-300 ${
          checked ? 'bg-brand-600' : 'bg-stone-300'
        }`}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${
            checked ? 'translate-x-5' : ''
          }`}
        />
      </span>
      {label}
    </button>
  )
}

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
      <Md>{children}</Md>
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

/** "by Lakshmi Nair (home nurse…)" and "symptom" out of a retain context string. */
function parseContext(context?: string | null): { by?: string; kind?: string } {
  if (!context) return {}
  const parts = context.split('·').map((p) => p.trim())
  const by = parts
    .find((p) => p.startsWith('by '))
    ?.slice(3)
    .split(' (')[0]
  const kind = parts[0] === 'care log' ? parts[1] : undefined
  return { by, kind }
}

export function SourceList({ sources }: { sources: Source[] }) {
  if (sources.length === 0) return null
  return (
    <details className="group mt-5 text-base">
      <summary className="flex cursor-pointer list-none items-center gap-2 font-medium text-stone-500 hover:text-brand-700">
        <Brain className="h-5 w-5" />
        Based on {sources.length} memories — see who recorded what
        <span className="transition-transform group-open:rotate-90">›</span>
      </summary>
      <ul className="stagger mt-3 space-y-2">
        {sources.map((s, i) => {
          const { by, kind } = parseContext(s.context)
          return (
            <li
              key={i}
              className="rounded-xl border-l-4 border-brand-200 bg-stone-50 px-4 py-2.5 transition hover:border-brand-500 hover:bg-white"
            >
              <div className="mb-0.5 flex flex-wrap items-center gap-2 text-sm">
                {s.date && (
                  <span className="font-semibold text-brand-700">{formatDate(s.date)}</span>
                )}
                {by && <span className="text-stone-500">recorded by {by}</span>}
                {kind && (
                  <span className="rounded-full bg-stone-200/70 px-2 text-xs text-stone-600">
                    {kind}
                  </span>
                )}
              </div>
              {s.text}
            </li>
          )
        })}
      </ul>
    </details>
  )
}

/** Shows whether every date in an answer is backed by a source memory. */
export function FactCheck({ checks }: { checks: DateCheck[] }) {
  if (checks.length === 0) return null
  const bad = checks.filter((c) => !c.supported)
  return bad.length === 0 ? (
    <div className="mt-4 inline-flex animate-pop items-center gap-2 rounded-full bg-brand-50 px-3 py-1.5 text-sm font-medium text-brand-700 [animation-delay:1.4s]">
      <ShieldCheck className="h-4 w-4" />
      All {checks.length} date{checks.length > 1 ? 's' : ''} match the family’s records
    </div>
  ) : (
    <div className="mt-4 flex animate-pop items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 [animation-delay:1.4s]">
      <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
      <span>
        {bad.length} date{bad.length > 1 ? 's' : ''} not found in the records:{' '}
        <strong>{bad.map((c) => c.mention).join(', ')}</strong>. Double-check before relying on
        {bad.length > 1 ? ' them' : ' it'}.
      </span>
    </div>
  )
}
