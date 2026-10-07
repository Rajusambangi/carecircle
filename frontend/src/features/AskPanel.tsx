import {
  Activity,
  ArrowUp,
  Bot,
  Brain,
  CalendarHeart,
  ClipboardCheck,
  Droplet,
  History,
  type LucideIcon,
  Pill,
  RotateCcw,
  Sparkles,
  SplitSquareHorizontal,
  TriangleAlert,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../api/client'
import { MicButton } from '../components/MicButton'
import {
  CountUp,
  EmergencyBanner,
  ErrorBox,
  FactCheck,
  Skeleton,
  SourceList,
  StreamedMarkdown,
  Thinking,
} from '../components/ui'
import { errorMessage } from '../lib/format'
import type { AskResponse, Checkpoint, Circle } from '../types'

const SUGGESTIONS: { text: string; icon: LucideIcon }[] = [
  {
    text: 'Dad has been dizzy again this morning. What should I tell the cardiologist?',
    icon: Activity,
  },
  { text: 'Which medicines has Dad reacted badly to?', icon: Pill },
  { text: 'What did the doctors ask us to do that we have not done yet?', icon: ClipboardCheck },
  { text: 'What makes his evening sugar go up?', icon: Droplet },
  { text: 'How should we prepare Dad for Wednesday’s appointment?', icon: CalendarHeart },
]
const CURVE_QUESTION = SUGGESTIONS[0].text

type Mode = 'compare' | 'curve' | 'memory'

const MODES: { id: Mode; label: string; icon: LucideIcon; hint: string }[] = [
  {
    id: 'compare',
    label: 'vs no memory',
    icon: SplitSquareHorizontal,
    hint: 'Side by side with the same AI without memory',
  },
  {
    id: 'curve',
    label: 'Learning curve',
    icon: History,
    hint: 'The same question at Week 1, Day 45 and Today',
  },
  { id: 'memory', label: 'CareCircle only', icon: Brain, hint: 'Just the memory-powered answer' },
]

interface Answer {
  key: string
  label: string
  checkpoint?: string // undefined = no memory
  memoryCount?: number | null
  level: 0 | 1 | 2 | 3 // visual emphasis, grows with memory
  loading: boolean
  response?: AskResponse
  error?: string
}

interface Turn {
  id: number
  question: string
  mode: Mode
  answers: Answer[]
}

interface Props {
  circle: Circle
  authorId: string
}

export function AskPanel({ circle, authorId }: Props) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [mode, setMode] = useState<Mode>('compare')
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([])
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const nextId = useRef(1)
  const draftRef = useRef(draft)
  useEffect(() => {
    draftRef.current = draft
  }, [draft])

  const first = circle.patient.name.split(' ')[0]
  const author = circle.caregivers.find((c) => c.id === authorId)
  const busy = turns.some((t) => t.answers.some((a) => a.loading))

  useEffect(() => {
    api
      .checkpoints()
      .then(setCheckpoints)
      .catch(() => setCheckpoints([]))
  }, [])

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  function plan(m: Mode): Answer[] {
    const noMemory: Answer = { key: 'none', label: 'Without memory', level: 0, loading: true }
    const at = (id: string, level: Answer['level']): Answer => {
      const cp = checkpoints.find((c) => c.id === id)
      return {
        key: id,
        label: id === 'today' ? 'CareCircle' : `CareCircle · ${cp?.label ?? id}`,
        checkpoint: id,
        memoryCount: cp?.memory_count,
        level,
        loading: true,
      }
    }
    if (m === 'curve') return [noMemory, at('week1', 1), at('day45', 2), at('today', 3)]
    if (m === 'compare') return [noMemory, at('today', 3)]
    return [at('today', 3)]
  }

  function patch(turnId: number, key: string, update: Partial<Answer>) {
    setTurns((all) =>
      all.map((t) =>
        t.id === turnId
          ? { ...t, answers: t.answers.map((a) => (a.key === key ? { ...a, ...update } : a)) }
          : t,
      ),
    )
  }

  async function run(turnId: number, question: string, a: Answer) {
    try {
      const response = await api.ask({
        question,
        patient_id: circle.patient.id,
        use_memory: a.checkpoint !== undefined,
        checkpoint: a.checkpoint,
      })
      patch(turnId, a.key, { loading: false, response })
    } catch (e) {
      patch(turnId, a.key, { loading: false, error: errorMessage(e) })
    }
  }

  function send(text = draft, m = mode) {
    const question = text.trim()
    if (!question || busy) return
    const id = nextId.current++
    const answers = plan(m)
    setTurns((all) => [...all, { id, question, mode: m, answers }])
    setDraft('')
    if (inputRef.current) inputRef.current.style.height = ''
    answers.forEach((a) => void run(id, question, a))
  }

  function watchLearn() {
    setMode('curve')
    send(CURVE_QUESTION, 'curve')
  }

  return (
    <div className="flex min-h-[calc(100vh-11rem)] flex-col">
      <div className="flex-1 space-y-12 pb-6">
        {turns.length === 0 ? (
          <Welcome first={first} onPick={(q) => send(q)} onWatchLearn={watchLearn} />
        ) : (
          <>
            <div className="flex justify-end">
              <button
                onClick={() => setTurns([])}
                disabled={busy}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm text-stone-500 transition hover:bg-white hover:text-stone-800 disabled:opacity-40"
              >
                <RotateCcw className="h-4 w-4" /> New conversation
              </button>
            </div>
            {turns.map((turn) => (
              <TurnView key={turn.id} turn={turn} initial={author?.name[0] ?? '?'} />
            ))}
          </>
        )}
        <div ref={endRef} />
      </div>

      {/* Composer, pinned to the bottom of the viewport */}
      <div className="sticky bottom-0 z-10 -mx-2 bg-gradient-to-t from-stone-50 via-stone-50/95 to-transparent px-2 pt-8 pb-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send()
          }}
          className="mx-auto max-w-5xl rounded-3xl border border-stone-200 bg-white p-2 shadow-xl shadow-stone-900/5 transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100"
        >
          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={1}
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value)
                e.target.style.height = ''
                e.target.style.height = `${Math.min(e.target.scrollHeight, 180)}px`
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
              }}
              placeholder={`Ask anything about ${first}’s care — type or speak…`}
              className="max-h-44 flex-1 resize-none bg-transparent px-4 py-3 text-lg outline-none placeholder:text-stone-400"
            />
            <div className="mb-1 flex items-center gap-2">
              <MicButton
                size="lg"
                onTranscript={(t) => setDraft((d) => (d ? `${d} ${t}` : t))}
                // Hands-free: send once the speaker pauses. The short delay lets the last
                // phrase (flushed as the mic stops) land in the draft first.
                onPause={() => setTimeout(() => send(draftRef.current), 150)}
              />
              <button
                type="submit"
                disabled={!draft.trim() || busy}
                aria-label="Send"
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 active:scale-90 disabled:translate-y-0 disabled:bg-stone-300 disabled:shadow-none"
              >
                {busy ? (
                  <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <ArrowUp className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 px-2 pt-1 pb-1">
            <div className="flex rounded-2xl bg-stone-100 p-1" role="radiogroup" aria-label="Mode">
              {MODES.map(({ id, label, icon: Icon, hint }) => (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={mode === id}
                  title={hint}
                  onClick={() => setMode(id)}
                  className={`flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
                    mode === id
                      ? 'bg-white text-brand-700 shadow-sm'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            <span className="hidden text-sm text-stone-400 md:block">
              Enter to send · Shift + Enter for a new line
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

function Welcome({
  first,
  onPick,
  onWatchLearn,
}: {
  first: string
  onPick: (q: string) => void
  onWatchLearn: () => void
}) {
  return (
    <div className="flex flex-col items-center pt-4 text-center">
      <div className="relative mb-6 animate-float">
        <span className="absolute inset-0 animate-ping rounded-3xl bg-brand-400/30 [animation-duration:2.5s]" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-xl shadow-brand-600/30">
          <Brain className="h-11 w-11" />
        </span>
      </div>
      <h1 className="animate-fade-up text-4xl font-bold text-stone-900">
        Ask about <span className="text-gradient">{first}’s care</span>
      </h1>
      <p className="mt-3 max-w-2xl animate-fade-up text-lg text-stone-500 [animation-delay:80ms]">
        Every answer draws on what the family, the nurse and the doctors have recorded — with dates
        and who said it.
      </p>

      <button
        onClick={onWatchLearn}
        className="group relative mt-8 flex animate-fade-up items-center gap-4 overflow-hidden rounded-3xl border-2 border-brand-200 bg-gradient-to-r from-brand-50 via-white to-amber-50 px-6 py-4 text-left shadow-md transition-all duration-300 [animation-delay:160ms] hover:-translate-y-1 hover:border-brand-500 hover:shadow-xl"
      >
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white transition-transform duration-500 group-hover:rotate-[-20deg]">
          <History className="h-6 w-6" />
        </span>
        <span>
          <span className="flex items-center gap-2 text-lg font-semibold text-stone-900">
            Watch CareCircle learn <Sparkles className="h-4 w-4 text-amber-500" />
          </span>
          <span className="text-base text-stone-500">
            One question, asked with no memory, at Week 1, Day 45 and Today
          </span>
        </span>
      </button>

      <div className="stagger mt-8 grid w-full max-w-5xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SUGGESTIONS.map(({ text, icon: Icon }) => (
          <button
            key={text}
            onClick={() => onPick(text)}
            className="group flex items-start gap-3 rounded-2xl border border-stone-200 bg-white/90 p-5 text-left text-base text-stone-700 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-lg"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-600 group-hover:text-white">
              <Icon className="h-5 w-5" />
            </span>
            {text}
          </button>
        ))}
      </div>
    </div>
  )
}

function TurnView({ turn, initial }: { turn: Turn; initial: string }) {
  const safety = turn.answers.find((a) => a.response?.safety)?.response?.safety
  const grid =
    turn.mode === 'curve'
      ? 'md:grid-cols-2 2xl:grid-cols-4'
      : turn.mode === 'compare'
        ? 'lg:grid-cols-2'
        : ''
  return (
    <div className="space-y-5">
      <div className="flex animate-slide-in items-end justify-end gap-3">
        <p className="max-w-3xl rounded-3xl rounded-br-md bg-brand-600 px-5 py-3.5 text-lg text-white shadow-md shadow-brand-600/20">
          {turn.question}
        </p>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 font-bold text-amber-900">
          {initial}
        </span>
      </div>

      {safety && <EmergencyBanner alert={safety} />}
      {turn.mode === 'curve' && <CurveBar answers={turn.answers} />}

      <div className={`grid items-start gap-5 ${grid}`}>
        {turn.answers.map((a, i) => (
          <AnswerCard key={a.key} answer={a} delay={i * 90} />
        ))}
      </div>
    </div>
  )
}

/** Progress line from "no memory" to "today", filling as the memory grows. */
function CurveBar({ answers }: { answers: Answer[] }) {
  return (
    <div className="animate-fade-up rounded-3xl border border-stone-200 bg-white/80 px-6 py-4">
      <p className="mb-3 flex items-center gap-2 text-sm font-semibold tracking-wider text-brand-700 uppercase">
        <History className="h-4 w-4" /> The same question as memory grows
      </p>
      <div className="relative">
        <div className="absolute top-2 right-4 left-4 h-1.5 rounded-full bg-stone-200" />
        <div className="absolute top-2 right-4 left-4 h-1.5 origin-left animate-grow rounded-full bg-gradient-to-r from-stone-300 via-brand-400 to-brand-700" />
        <div className="relative grid grid-cols-4">
          {answers.map((a, i) => (
            <div key={a.key} className="flex flex-col items-center gap-1.5 text-center">
              <span
                className="h-5 w-5 animate-pop rounded-full border-4 border-white shadow"
                style={{
                  animationDelay: `${300 + i * 350}ms`,
                  background: ['#d6d3d1', '#5eead4', '#14b8a6', '#0f766e'][a.level],
                }}
              />
              <span className="text-sm font-semibold text-stone-700">
                {a.checkpoint ? a.label.replace('CareCircle · ', '') : 'No memory'}
              </span>
              <span className="text-xs text-stone-400">
                {a.checkpoint === undefined
                  ? '0 memories'
                  : isEmptyCheckpoint(a)
                    ? 'not loaded'
                    : `${a.memoryCount} memories`}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** A past checkpoint whose bank was never seeded (the live bank is never "empty" here). */
function isEmptyCheckpoint(a: Answer): boolean {
  return a.checkpoint !== undefined && a.checkpoint !== 'today' && !a.memoryCount
}

const LEVEL_STYLES = [
  'border-stone-200 bg-stone-50/90',
  'border-brand-100 bg-white',
  'border-brand-200 bg-white ring-2 ring-brand-50',
  'border-brand-500 bg-white shadow-lg shadow-brand-600/10 ring-4 ring-brand-100',
]

function AnswerCard({ answer, delay }: { answer: Answer; delay: number }) {
  const muted = answer.level === 0
  const Icon = muted ? Bot : Brain
  const r = answer.response
  return (
    <div
      style={{ animationDelay: `${delay}ms` }}
      className={`animate-slide-left rounded-3xl rounded-tl-md border p-6 ${LEVEL_STYLES[answer.level]}`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
            muted ? 'bg-stone-200 text-stone-500' : 'bg-brand-600 text-white'
          }`}
          style={muted ? undefined : { opacity: 0.55 + answer.level * 0.15 }}
        >
          <Icon className={`h-6 w-6 ${answer.loading && !muted ? 'animate-breathe' : ''}`} />
        </span>
        <div className="min-w-0">
          <p className={`text-lg font-semibold ${muted ? 'text-stone-500' : 'text-brand-700'}`}>
            {answer.label}
          </p>
          <p className="text-sm text-stone-400">
            {muted ? (
              'Same AI, no family history'
            ) : answer.memoryCount != null ? (
              <>
                Hindsight memory · <CountUp value={answer.memoryCount} /> memories
              </>
            ) : (
              'Powered by Hindsight memory'
            )}
          </p>
        </div>
      </div>
      {isEmptyCheckpoint(answer) && (
        <div className="mb-4 flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This checkpoint’s memory bank is empty. Run <code>make seed-checkpoints</code> to load
            the history up to this date.
          </span>
        </div>
      )}
      {answer.loading && (
        <>
          <Thinking label={muted ? 'Thinking' : 'Searching memory'} />
          <Skeleton lines={5} />
        </>
      )}
      {answer.error && (
        <ErrorBox
          message={
            answer.checkpoint && answer.checkpoint !== 'today'
              ? `${answer.error} — seed the checkpoint banks with “make seed”.`
              : answer.error
          }
        />
      )}
      {r && (
        <>
          <StreamedMarkdown text={r.answer} />
          <FactCheck checks={r.date_checks ?? []} />
          <SourceList sources={r.sources} />
        </>
      )}
    </div>
  )
}
