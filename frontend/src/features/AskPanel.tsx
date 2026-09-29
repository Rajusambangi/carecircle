import {
  Activity,
  ArrowUp,
  Bot,
  Brain,
  CalendarHeart,
  ClipboardCheck,
  Droplet,
  type LucideIcon,
  Pill,
  RotateCcw,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

import { api } from '../api/client'
import {
  EmergencyBanner,
  ErrorBox,
  Skeleton,
  SourceList,
  StreamedMarkdown,
  Switch,
  Thinking,
} from '../components/ui'
import { errorMessage } from '../lib/format'
import type { AskResponse, Circle } from '../types'

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

type Side = { loading: boolean; answer?: AskResponse; error?: string }

interface Turn {
  id: number
  question: string
  compare: boolean
  on: Side
  off?: Side
}

interface Props {
  circle: Circle
  authorId: string
}

export function AskPanel({ circle, authorId }: Props) {
  const [turns, setTurns] = useState<Turn[]>([])
  const [draft, setDraft] = useState('')
  const [compare, setCompare] = useState(true)
  const endRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const nextId = useRef(1)

  const first = circle.patient.name.split(' ')[0]
  const author = circle.caregivers.find((c) => c.id === authorId)
  const busy = turns.some((t) => t.on.loading || t.off?.loading)

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [turns])

  function update(id: number, side: 'on' | 'off', patch: Side) {
    setTurns((all) => all.map((t) => (t.id === id ? { ...t, [side]: patch } : t)))
  }

  async function run(id: number, question: string, useMemory: boolean) {
    const side = useMemory ? 'on' : 'off'
    try {
      const answer = await api.ask({
        question,
        patient_id: circle.patient.id,
        use_memory: useMemory,
      })
      update(id, side, { loading: false, answer })
    } catch (e) {
      update(id, side, { loading: false, error: errorMessage(e) })
    }
  }

  function send(text = draft) {
    const question = text.trim()
    if (!question || busy) return
    const id = nextId.current++
    setTurns((all) => [
      ...all,
      {
        id,
        question,
        compare,
        on: { loading: true },
        off: compare ? { loading: true } : undefined,
      },
    ])
    setDraft('')
    if (inputRef.current) inputRef.current.style.height = ''
    void run(id, question, true)
    if (compare) void run(id, question, false)
  }

  return (
    <div className="flex min-h-[calc(100vh-11rem)] flex-col">
      <div className="flex-1 space-y-10 pb-6">
        {turns.length === 0 ? (
          <Welcome first={first} onPick={send} />
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
              placeholder={`Ask anything about ${first}’s care…`}
              className="max-h-44 flex-1 resize-none bg-transparent px-4 py-3 text-lg outline-none placeholder:text-stone-400"
            />
            <button
              type="submit"
              disabled={!draft.trim() || busy}
              aria-label="Send"
              className="mb-1 flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-md shadow-brand-600/30 transition-all duration-200 hover:-translate-y-0.5 hover:bg-brand-700 active:scale-90 disabled:translate-y-0 disabled:bg-stone-300 disabled:shadow-none"
            >
              {busy ? (
                <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <ArrowUp className="h-6 w-6" />
              )}
            </button>
          </div>
          <div className="flex items-center justify-between px-4 pt-1 pb-1.5">
            <Switch
              checked={compare}
              onChange={setCompare}
              label={
                <>
                  Compare with an assistant that has <strong>no memory</strong>
                </>
              }
            />
            <span className="hidden text-sm text-stone-400 sm:block">
              Enter to send · Shift + Enter for a new line
            </span>
          </div>
        </form>
      </div>
    </div>
  )
}

function Welcome({ first, onPick }: { first: string; onPick: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-6 text-center">
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
      <div className="stagger mt-10 grid w-full max-w-5xl gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
  const safety = turn.on.answer?.safety ?? turn.off?.answer?.safety
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

      <div className={`grid gap-5 ${turn.compare ? 'lg:grid-cols-2' : ''}`}>
        {turn.off && <AnswerCard side={turn.off} muted />}
        <AnswerCard side={turn.on} />
      </div>
    </div>
  )
}

function AnswerCard({ side, muted = false }: { side: Side; muted?: boolean }) {
  const Icon = muted ? Bot : Brain
  return (
    <div
      className={`animate-slide-left rounded-3xl rounded-tl-md border p-6 ${
        muted
          ? 'border-stone-200 bg-stone-50/90'
          : 'border-brand-500 bg-white shadow-lg shadow-brand-600/10 ring-4 ring-brand-100'
      }`}
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            muted ? 'bg-stone-200 text-stone-500' : 'bg-brand-600 text-white'
          }`}
        >
          <Icon className={`h-6 w-6 ${side.loading && !muted ? 'animate-breathe' : ''}`} />
        </span>
        <div>
          <p className={`text-lg font-semibold ${muted ? 'text-stone-500' : 'text-brand-700'}`}>
            {muted ? 'Without memory' : 'CareCircle'}
          </p>
          <p className="text-sm text-stone-400">
            {muted ? 'Same AI, no family history' : 'Powered by Hindsight memory'}
          </p>
        </div>
      </div>
      {side.loading && (
        <>
          <Thinking label={muted ? 'Thinking' : 'Searching memory'} />
          <Skeleton lines={5} />
        </>
      )}
      {side.error && <ErrorBox message={side.error} />}
      {side.answer && (
        <>
          <StreamedMarkdown text={side.answer.answer} />
          <SourceList sources={side.answer.sources} />
        </>
      )}
    </div>
  )
}
