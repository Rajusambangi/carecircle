import { Bell, CheckCircle2, CircleAlert, ListTodo, X } from 'lucide-react'
import { useState } from 'react'
import { createPortal } from 'react-dom'

import { api } from '../api/client'
import { errorMessage, formatDate } from '../lib/format'
import type { Circle, DigestResponse } from '../types'
import { ErrorBox, MarkdownText, Skeleton, Thinking } from './ui'

const IMPORTANCE = {
  high: 'border-red-400 bg-red-50',
  medium: 'border-amber-300 bg-amber-50/60',
  low: 'border-stone-200 bg-white',
} as const

/** Header button + slide-over with a "since you last checked" digest for the current caregiver. */
export function CatchUp({ circle, authorId }: { circle: Circle; authorId: string }) {
  const [open, setOpen] = useState(false)
  const [cache, setCache] = useState<Record<string, DigestResponse>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [seen, setSeen] = useState<Set<string>>(new Set())

  const me = circle.caregivers.find((c) => c.id === authorId)
  const data = cache[authorId]

  async function openDrawer() {
    setOpen(true)
    setSeen((s) => new Set(s).add(authorId))
    if (cache[authorId]) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.digest({ patient_id: circle.patient.id, caregiver_id: authorId })
      setCache((c) => ({ ...c, [authorId]: res }))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => void openDrawer()}
        className="group relative flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3.5 py-2.5 text-base font-medium text-stone-700 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
      >
        <Bell className="h-5 w-5 transition-transform group-hover:rotate-12" />
        What’s new
        {!seen.has(authorId) && (
          <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex h-3.5 w-3.5 rounded-full bg-red-500" />
          </span>
        )}
      </button>

      {/* Portal: the header's backdrop-filter would otherwise trap these fixed layers inside it. */}
      {createPortal(
        <>
          <div
            className={`fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-sm transition-opacity duration-300 ${
              open ? 'opacity-100' : 'pointer-events-none opacity-0'
            }`}
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            aria-label="Catch-up"
            className={`fixed top-0 right-0 z-50 flex h-full w-full max-w-xl flex-col bg-white shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
              open ? 'translate-x-0' : 'translate-x-full'
            }`}
          >
            <header className="flex items-start justify-between gap-4 border-b border-stone-100 px-7 py-6">
              <div>
                <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">
                  Since you last checked
                </p>
                <h2 className="mt-1 text-2xl font-bold text-stone-900">
                  Welcome back, {me?.name.split(' ')[0]}
                </h2>
                <p className="text-base text-stone-500">
                  {data
                    ? `Everything the circle recorded since ${formatDate(data.since)}`
                    : me?.role}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="rounded-xl p-2 text-stone-400 transition hover:rotate-90 hover:bg-stone-100 hover:text-stone-700"
              >
                <X className="h-6 w-6" />
              </button>
            </header>

            <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
              {loading && (
                <>
                  <Thinking label="Catching you up" />
                  <Skeleton lines={8} />
                </>
              )}
              {error && <ErrorBox message={error} />}
              {data?.digest && (
                <>
                  <p className="animate-fade-up rounded-2xl border-l-4 border-brand-500 bg-brand-50 px-5 py-4 text-lg font-semibold text-brand-900">
                    {data.digest.headline}
                  </p>
                  <ol className="space-y-3">
                    {data.digest.updates.map((u, i) => (
                      <li
                        key={i}
                        style={{ animationDelay: `${120 + i * 90}ms` }}
                        className={`animate-slide-in rounded-2xl border-l-4 px-4 py-3 ${IMPORTANCE[u.importance]}`}
                      >
                        <div className="mb-1 flex items-center gap-2 text-sm">
                          {u.importance === 'high' ? (
                            <CircleAlert className="h-4 w-4 text-red-500" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-stone-400" />
                          )}
                          <span className="font-semibold text-stone-600">{formatDate(u.date)}</span>
                          {u.reported_by && (
                            <span className="text-stone-400">· {u.reported_by}</span>
                          )}
                        </div>
                        <p className="text-base text-stone-800">{u.text}</p>
                      </li>
                    ))}
                  </ol>
                  {data.digest.action_items.length > 0 && (
                    <section className="animate-fade-up rounded-2xl border border-stone-200 p-5 [animation-delay:500ms]">
                      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-brand-700 uppercase">
                        <ListTodo className="h-5 w-5" /> What you could do
                      </h3>
                      <ul className="space-y-2">
                        {data.digest.action_items.map((a, i) => (
                          <li key={i} className="flex items-start gap-3 text-base text-stone-700">
                            <input type="checkbox" className="mt-1 h-5 w-5 accent-brand-600" />
                            {a}
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}
                </>
              )}
              {data && !data.digest && <MarkdownText>{data.raw_text ?? ''}</MarkdownText>}
            </div>
          </aside>
        </>,
        document.body,
      )}
    </>
  )
}
