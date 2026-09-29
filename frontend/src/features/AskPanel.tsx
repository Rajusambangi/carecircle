import { Bot, Brain, Send, Sparkles } from 'lucide-react'
import { useState } from 'react'

import { api } from '../api/client'
import {
  Button,
  Card,
  EmergencyBanner,
  ErrorBox,
  MarkdownText,
  Skeleton,
  SourceList,
  Thinking,
} from '../components/ui'
import { errorMessage } from '../lib/format'
import type { AskResponse, Circle } from '../types'

const SUGGESTIONS = [
  'Dad has been dizzy again this morning. What should I tell the cardiologist?',
  'Which medicines has Dad reacted badly to?',
  'What did the doctors ask us to do that we have not done yet?',
  'What makes his evening sugar go up?',
  'How should we prepare Dad for Wednesday’s appointment?',
]

type Answers = { on?: AskResponse; off?: AskResponse }

export function AskPanel({ circle }: { circle: Circle }) {
  const [question, setQuestion] = useState('')
  const [compare, setCompare] = useState(true)
  const [answers, setAnswers] = useState<Answers>({})
  const [loading, setLoading] = useState<{ on: boolean; off: boolean }>({ on: false, off: false })
  const [error, setError] = useState<string | null>(null)

  async function run(useMemory: boolean, q: string) {
    const key = useMemory ? 'on' : 'off'
    setLoading((l) => ({ ...l, [key]: true }))
    try {
      const res = await api.ask({
        question: q,
        patient_id: circle.patient.id,
        use_memory: useMemory,
      })
      setAnswers((a) => ({ ...a, [key]: res }))
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setLoading((l) => ({ ...l, [key]: false }))
    }
  }

  function ask(q = question) {
    if (!q.trim()) return
    setQuestion(q)
    setError(null)
    setAnswers({})
    void run(true, q)
    if (compare) void run(false, q)
  }

  const safety = answers.on?.safety ?? answers.off?.safety
  const first = circle.patient.name.split(' ')[0]

  return (
    <div className="space-y-6">
      <Card>
        <h1 className="mb-1 text-2xl font-bold text-stone-900">Ask about {first}’s care</h1>
        <p className="mb-5 text-base text-stone-500">
          Answers come from everything the family, nurse and doctors have recorded.
        </p>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            ask()
          }}
          className="flex gap-3"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={`e.g. When did ${first}'s dizziness start?`}
            className="flex-1 rounded-2xl border border-stone-200 bg-white px-4 py-3 text-lg transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100 focus:outline-none"
          />
          <Button type="submit" loading={loading.on} className="px-6">
            {!loading.on && <Send className="h-5 w-5" />}
            Ask
          </Button>
        </form>
        <div className="stagger mt-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => ask(s)}
              className="flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-4 py-2 text-sm text-stone-600 transition hover:-translate-y-0.5 hover:border-brand-500 hover:text-brand-700 hover:shadow-sm"
            >
              <Sparkles className="h-4 w-4 text-brand-500" />
              {s}
            </button>
          ))}
        </div>
        <label className="mt-5 flex w-fit cursor-pointer items-center gap-3 text-base text-stone-600">
          <input
            type="checkbox"
            checked={compare}
            onChange={(e) => setCompare(e.target.checked)}
            className="h-5 w-5 accent-brand-600"
          />
          Compare with an assistant that has <strong>no memory</strong>
        </label>
      </Card>

      {error && <ErrorBox message={error} />}
      {safety && <EmergencyBanner alert={safety} />}

      <div className={`grid gap-6 ${compare ? 'md:grid-cols-2' : ''}`}>
        {compare && (
          <AnswerCard
            title="Without memory"
            subtitle="Same AI, no family history"
            loading={loading.off}
            answer={answers.off}
            muted
          />
        )}
        <AnswerCard
          title="CareCircle"
          subtitle="Powered by Hindsight memory"
          loading={loading.on}
          answer={answers.on}
        />
      </div>
    </div>
  )
}

interface AnswerCardProps {
  title: string
  subtitle: string
  loading: boolean
  answer?: AskResponse
  muted?: boolean
}

function AnswerCard({ title, subtitle, loading, answer, muted = false }: AnswerCardProps) {
  if (!loading && !answer) return null
  const Icon = muted ? Bot : Brain
  return (
    <Card
      className={
        muted
          ? 'bg-stone-50/90'
          : 'border-brand-500 shadow-lg shadow-brand-600/10 ring-4 ring-brand-100'
      }
    >
      <div className="mb-4 flex items-center gap-3">
        <span
          className={`flex h-11 w-11 items-center justify-center rounded-2xl ${
            muted ? 'bg-stone-200 text-stone-500' : 'bg-brand-600 text-white'
          }`}
        >
          <Icon className={`h-6 w-6 ${loading && !muted ? 'animate-breathe' : ''}`} />
        </span>
        <div>
          <p className={`text-lg font-semibold ${muted ? 'text-stone-500' : 'text-brand-700'}`}>
            {title}
          </p>
          <p className="text-sm text-stone-400">{subtitle}</p>
        </div>
      </div>
      {loading && (
        <>
          <Thinking label={muted ? 'Thinking' : 'Searching memory'} />
          <Skeleton lines={5} />
        </>
      )}
      {answer && (
        <>
          <MarkdownText>{answer.answer}</MarkdownText>
          <SourceList sources={answer.sources} />
        </>
      )}
    </Card>
  )
}
