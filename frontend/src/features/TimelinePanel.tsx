import { CalendarDays, Search } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { api } from '../api/client'
import { Badge, Card, ErrorBox, Reveal, Skeleton, Spinner } from '../components/ui'
import { errorMessage, formatDate } from '../lib/format'
import type { Circle, TimelineItem } from '../types'

export function TimelinePanel({ circle }: { circle: Circle }) {
  const [items, setItems] = useState<TimelineItem[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // State is only set once the request settles, so this is safe to call from an effect.
  const load = useCallback(
    (q?: string) =>
      api
        .timeline(circle.patient.id, q)
        .then(setItems, (e: unknown) => setError(errorMessage(e)))
        .finally(() => setLoading(false)),
    [circle.patient.id],
  )

  useEffect(() => {
    void load()
  }, [load])

  function search(q: string) {
    setLoading(true)
    setError(null)
    void load(q)
  }

  const byMonth = groupByMonth(items)

  return (
    <div className="space-y-6">
      <Card className="py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            search(query)
          }}
          className="flex items-center gap-3"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-stone-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search memories — e.g. Metoprolol, fall, sugar"
              className="w-full rounded-2xl border border-stone-200 bg-white py-3 pr-4 pl-12 text-lg transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
            />
          </div>
          {loading && <Spinner />}
          <Badge tone="brand">{items.length} memories</Badge>
        </form>
      </Card>

      {error && <ErrorBox message={error} />}
      {loading && items.length === 0 && (
        <Card>
          <Skeleton lines={6} />
        </Card>
      )}

      {byMonth.map(([month, list]) => (
        <section key={month}>
          <h3 className="mb-3 flex items-center gap-2 text-base font-bold tracking-wide text-stone-500 uppercase">
            <CalendarDays className="h-5 w-5 text-brand-600" />
            {month}
          </h3>
          <ol className="relative space-y-3 border-l-2 border-brand-200 pl-6">
            {list.map((m) => (
              <li key={m.id} className="relative">
                <Reveal>
                  <span className="absolute top-4 -left-[33px] h-4 w-4 rounded-full border-4 border-white bg-brand-500 shadow" />
                  <div className="rounded-2xl border border-stone-200 bg-white px-5 py-3.5 text-base transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md">
                    <div className="mb-1.5 flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-stone-500">
                        {formatDate(m.date)}
                      </span>
                      {m.tags
                        .filter((t) => t.startsWith('type:'))
                        .map((t) => (
                          <Badge key={t}>{t.slice(5).replace('_', ' ')}</Badge>
                        ))}
                      {m.fact_type && <Badge tone="brand">{m.fact_type}</Badge>}
                    </div>
                    {m.text}
                  </div>
                </Reveal>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {!loading && items.length === 0 && !error && (
        <p className="py-10 text-center text-lg text-stone-400">
          No memories yet. Start by logging something.
        </p>
      )}
    </div>
  )
}

function groupByMonth(items: TimelineItem[]): [string, TimelineItem[]][] {
  const groups = new Map<string, TimelineItem[]>()
  for (const item of items) {
    const d = item.date ? new Date(item.date) : null
    const key =
      d && !Number.isNaN(d.getTime())
        ? d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })
        : 'Undated'
    groups.set(key, [...(groups.get(key) ?? []), item])
  }
  return [...groups.entries()]
}
