import {
  Brain,
  CircleCheck,
  Lightbulb,
  type LucideIcon,
  Save,
  TriangleAlert,
  Zap,
} from 'lucide-react'
import { useState } from 'react'

import { api } from '../api/client'
import { MicButton } from '../components/MicButton'
import { Badge, Button, Card, EmergencyBanner, ErrorBox, Thinking } from '../components/ui'
import { errorMessage, formatDate } from '../lib/format'
import { useToast } from '../lib/toast'
import type { Alert, Circle, LogResponse } from '../types'

const EXAMPLES = [
  'Dr. Mehta called with the urine culture result and wants to start Bactrim DS twice a day for 5 days.',
  'Dad felt dizzy again this morning getting out of bed. BP 110/68, pulse 52.',
  'Dad refused lunch and seemed confused about what day it is.',
]

const ALERT_STYLES: Record<Alert['severity'], { box: string; icon: LucideIcon; color: string }> = {
  urgent: {
    box: 'border-red-300 bg-red-50',
    icon: TriangleAlert,
    color: 'text-red-600',
  },
  warning: { box: 'border-amber-300 bg-amber-50', icon: Zap, color: 'text-amber-600' },
  info: { box: 'border-brand-200 bg-brand-50', icon: Lightbulb, color: 'text-brand-600' },
}

interface Props {
  circle: Circle
  authorId: string
}

export function LogPanel({ circle, authorId }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [entries, setEntries] = useState<LogResponse[]>([])
  const toast = useToast()

  const author = circle.caregivers.find((c) => c.id === authorId)
  const first = circle.patient.name.split(' ')[0]

  async function submit() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)
    try {
      const res = await api.log({ text, author_id: authorId, patient_id: circle.patient.id })
      setEntries((prev) => [res, ...prev])
      setText('')
      const links = res.alerts.length
      toast.show(
        links
          ? `Saved to memory · ${links} link${links > 1 ? 's' : ''} to past events`
          : 'Saved to memory',
        res.safety || res.alerts.some((a) => a.severity === 'urgent') ? 'warning' : 'success',
      )
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <Card className="xl:sticky xl:top-28">
        <h1 className="mb-1 text-2xl font-bold text-stone-900">What happened?</h1>
        <p className="mb-4 text-base text-stone-500">
          Logging as <strong className="text-stone-700">{author?.name}</strong>. Write it the way
          you’d tell your family. CareCircle remembers it and checks it against {first}’s history.
        </p>
        <textarea
          rows={4}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit()
          }}
          placeholder="e.g. Dad felt dizzy after his bath, BP 112/70… or tap the mic and speak in English, हिंदी or मराठी"
          className="w-full resize-none rounded-2xl border border-stone-200 bg-white p-4 text-lg transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
        />
        <div className="stagger mt-4 flex flex-wrap items-center gap-2">
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              onClick={() => setText(ex)}
              className="rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-700 hover:shadow-sm"
            >
              {ex.slice(0, 44)}…
            </button>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <MicButton onTranscript={(t) => setText((d) => (d ? `${d} ${t}` : t))} />
            <span className="hidden text-sm text-stone-400 2xl:inline">⌘ + Enter to save</span>
          </div>
          <Button onClick={() => void submit()} loading={loading} className="px-6">
            {!loading && <Save className="h-5 w-5" />}
            Save to memory
          </Button>
        </div>
        {loading && (
          <div className="mt-4">
            <Thinking label={`Saving and checking ${first}’s history`} />
          </div>
        )}
      </Card>

      <div className="space-y-6">
        {error && <ErrorBox message={error} />}
        {entries.length === 0 && !error && (
          <div className="hidden rounded-3xl border-2 border-dashed border-stone-200 p-10 text-center text-lg text-stone-400 xl:block">
            Saved entries and any links to {first}’s history will appear here.
          </div>
        )}
        {entries.map((entry, i) => (
          <LogResult key={entries.length - i} entry={entry} circle={circle} />
        ))}
      </div>
    </div>
  )
}

function LogResult({ entry, circle }: { entry: LogResponse; circle: Circle }) {
  const { event, safety, alerts, alerts_error } = entry
  const author = circle.caregivers.find((c) => c.id === event.author_id)
  return (
    <div className="space-y-4">
      {safety && <EmergencyBanner alert={safety} />}
      {alerts.map((a, i) => {
        const style = ALERT_STYLES[a.severity]
        const Icon = style.icon
        return (
          <div
            key={i}
            style={{ animationDelay: `${150 + i * 120}ms` }}
            className={`flex animate-slide-in gap-4 rounded-2xl border-2 px-5 py-4 ${style.box}`}
          >
            <Icon className={`mt-0.5 h-7 w-7 shrink-0 ${style.color}`} />
            <div>
              <p className="text-lg font-semibold text-stone-900">{a.title}</p>
              <p className="mt-1 text-base text-stone-700">{a.detail}</p>
              {a.related_dates.length > 0 && (
                <p className="mt-3 flex flex-wrap gap-1.5">
                  {a.related_dates.map((d) => (
                    <Badge key={d}>{formatDate(d)}</Badge>
                  ))}
                </p>
              )}
            </div>
          </div>
        )
      })}
      {alerts_error && <ErrorBox message={alerts_error} />}
      <Card className="py-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="animate-ripple rounded-full">
            <Badge tone="brand">
              <CircleCheck className="h-4 w-4" /> remembered
            </Badge>
          </span>
          <Badge
            tone={
              event.severity === 'high' ? 'red' : event.severity === 'medium' ? 'amber' : 'stone'
            }
          >
            {event.type.replace('_', ' ')}
          </Badge>
          <span className="text-sm text-stone-400">
            {formatDate(event.occurred_at)} · {author?.name}
          </span>
        </div>
        <p className="mt-3 text-base text-stone-700">{event.summary ?? event.text}</p>
        {alerts.length === 0 && !alerts_error && !safety && (
          <p className="mt-2 text-sm text-stone-400">No links to past events found.</p>
        )}
        {entry.learned.length > 0 && <Learned facts={entry.learned} />}
      </Card>
    </div>
  )
}

/** What Hindsight extracted from this entry — makes the memory visible. */
function Learned({ facts }: { facts: LogResponse['learned'] }) {
  const entities = [...new Set(facts.flatMap((f) => f.entities))].slice(0, 10)
  return (
    <div className="mt-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50 to-white p-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-brand-700 uppercase">
        <Brain className="h-5 w-5 animate-breathe" /> What CareCircle just learned
      </p>
      <ul className="space-y-2">
        {facts.map((f, i) => (
          <li
            key={i}
            style={{ animationDelay: `${300 + i * 140}ms` }}
            className="flex animate-slide-left items-start gap-2 text-base text-stone-700"
          >
            <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-brand-500" />
            {f.text}
          </li>
        ))}
      </ul>
      {entities.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {entities.map((e) => (
            <span
              key={e}
              className="animate-pop rounded-full border border-brand-200 bg-white px-2.5 py-0.5 text-sm text-brand-700 [animation-delay:700ms]"
            >
              {e}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
