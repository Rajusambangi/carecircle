import {
  CalendarClock,
  FileText,
  Hourglass,
  type LucideIcon,
  NotebookPen,
  Pill,
  Printer,
  CircleHelp,
  TrendingUp,
} from 'lucide-react'
import { type ReactNode, useState } from 'react'

import { api } from '../api/client'
import {
  Button,
  Card,
  ErrorBox,
  MarkdownText,
  Skeleton,
  SourceList,
  Thinking,
} from '../components/ui'
import { errorMessage, formatDate } from '../lib/format'
import { useToast } from '../lib/toast'
import type { BriefResponse, Circle } from '../types'

export function BriefPanel({ circle }: { circle: Circle }) {
  const [doctorId, setDoctorId] = useState(circle.doctors.at(-1)?.id ?? '')
  const [since, setSince] = useState('2026-08-10')
  const [visitDate, setVisitDate] = useState('2026-09-30')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<BriefResponse | null>(null)
  const toast = useToast()

  async function generate() {
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const res = await api.brief({
        patient_id: circle.patient.id,
        doctor_id: doctorId,
        since: since || undefined,
        visit_date: visitDate || undefined,
      })
      setResult(res)
      toast.show(`Brief for ${res.doctor} is ready`)
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const field =
    'rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-base transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none'

  return (
    <div className="space-y-6">
      <Card className="no-print">
        <h1 className="mb-1 text-2xl font-bold text-stone-900">Doctor visit brief</h1>
        <p className="mb-5 text-base text-stone-500">
          A one-page summary of everything since the last visit, ready to hand to the doctor.
        </p>
        <div className="flex flex-wrap items-end gap-4">
          <label>
            <span className="mb-1.5 block text-sm font-medium text-stone-500">Doctor</span>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className={field}
            >
              {circle.doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name} — {d.specialty}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-stone-500">Last visit</span>
            <input
              type="date"
              value={since}
              onChange={(e) => setSince(e.target.value)}
              className={field}
            />
          </label>
          <label>
            <span className="mb-1.5 block text-sm font-medium text-stone-500">Upcoming visit</span>
            <input
              type="date"
              value={visitDate}
              onChange={(e) => setVisitDate(e.target.value)}
              className={field}
            />
          </label>
          <Button onClick={() => void generate()} loading={loading} className="px-6">
            {!loading && <FileText className="h-5 w-5" />}
            Generate brief
          </Button>
          {result && (
            <Button variant="ghost" onClick={() => window.print()}>
              <Printer className="h-5 w-5" /> Print
            </Button>
          )}
        </div>
      </Card>

      {error && <ErrorBox message={error} />}
      {loading && (
        <Card>
          <Thinking label={`Reading every entry since ${formatDate(since)}`} />
          <Skeleton lines={8} />
        </Card>
      )}
      {result && <BriefView result={result} />}
    </div>
  )
}

function BriefView({ result }: { result: BriefResponse }) {
  const { brief } = result
  return (
    <Card className="print:border-0 print:shadow-none">
      <header className="border-b border-stone-200 pb-5">
        <p className="text-sm font-semibold tracking-wider text-brand-600 uppercase">
          Visit brief · {result.specialty}
        </p>
        <h2 className="mt-1 text-2xl font-bold text-stone-900">
          {result.patient} → {result.doctor}
        </h2>
        <p className="mt-1 flex items-center gap-2 text-base text-stone-500">
          <CalendarClock className="h-5 w-5" />
          Visit {formatDate(result.visit_date)} · covering since {formatDate(result.since)}
        </p>
      </header>

      {brief ? (
        <div className="mt-5 space-y-6 text-base">
          <p className="rounded-2xl border-l-4 border-amber-400 bg-amber-50 px-5 py-4 text-lg font-semibold text-amber-900">
            {brief.headline}
          </p>
          <div className="stagger grid gap-x-10 gap-y-6 xl:grid-cols-2">
            <Section title="Since the last visit" icon={NotebookPen}>
              {brief.since_last_visit.map((x, i) => (
                <li key={i}>
                  <DateTag date={x.date} /> {x.item}
                  {x.reported_by && <span className="text-stone-400"> — {x.reported_by}</span>}
                </li>
              ))}
            </Section>
            <Section title="Medication changes" icon={Pill}>
              {brief.medication_changes.map((m, i) => (
                <li key={i}>
                  <DateTag date={m.date} /> <strong>{m.change}</strong>
                  {m.observed_after && <span> → {m.observed_after}</span>}
                </li>
              ))}
            </Section>
            <Section title="Trends" icon={TrendingUp}>
              {brief.trends.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </Section>
            <Section title="Pending follow-ups" icon={Hourglass}>
              {brief.pending_followups.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </Section>
            <Section title="Questions to ask" icon={CircleHelp}>
              {brief.questions_for_doctor.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </Section>
            <Section title="Notes for the visit" icon={NotebookPen}>
              {brief.care_notes.map((t, i) => (
                <li key={i}>{t}</li>
              ))}
            </Section>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <MarkdownText>{result.raw_text ?? ''}</MarkdownText>
        </div>
      )}
      <p className="mt-8 border-t border-stone-100 pt-4 text-sm text-stone-400">
        Compiled by CareCircle from family, nurse and clinic notes. Not a medical opinion.
      </p>
      <div className="no-print">
        <SourceList sources={result.sources} />
      </div>
    </Card>
  )
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string
  icon: LucideIcon
  children: ReactNode[]
}) {
  if (children.length === 0) return null
  return (
    <section>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-brand-700 uppercase">
        <Icon className="h-5 w-5" />
        {title}
      </h3>
      <ul className="space-y-2 border-l-2 border-brand-100 pl-5">{children}</ul>
    </section>
  )
}

function DateTag({ date }: { date: string }) {
  return <span className="mr-1 font-semibold text-stone-500">{formatDate(date)}</span>
}
