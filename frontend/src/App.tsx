import {
  Brain,
  CalendarDays,
  ClipboardList,
  HeartHandshake,
  MessageCircleHeart,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'

import { api } from './api/client'
import { ErrorBox, Thinking } from './components/ui'
import { AskPanel } from './features/AskPanel'
import { BriefPanel } from './features/BriefPanel'
import { LogPanel } from './features/LogPanel'
import { ProfilePanel } from './features/ProfilePanel'
import { TimelinePanel } from './features/TimelinePanel'
import type { Circle } from './types'

const TABS: { id: TabId; label: string; icon: LucideIcon }[] = [
  { id: 'ask', label: 'Ask', icon: MessageCircleHeart },
  { id: 'log', label: 'Log', icon: PenLine },
  { id: 'brief', label: 'Doctor brief', icon: ClipboardList },
  { id: 'timeline', label: 'Timeline', icon: CalendarDays },
  { id: 'profile', label: 'Care profile', icon: Brain },
]

type TabId = 'ask' | 'log' | 'brief' | 'timeline' | 'profile'

// Full width with side padding; capped only on very wide monitors to keep lines readable.
const CONTAINER = 'mx-auto w-full max-w-[120rem] px-6 lg:px-10'

export default function App() {
  const [circle, setCircle] = useState<Circle | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [tab, setTab] = useState<TabId>('ask')
  const [authorId, setAuthorId] = useState('priya')

  useEffect(() => {
    api
      .circle()
      .then(setCircle)
      .catch((e: unknown) =>
        setError(`Cannot reach the CareCircle API. Is the backend running? (${String(e)})`),
      )
  }, [])

  if (error)
    return (
      <div className="mx-auto max-w-xl p-10">
        <ErrorBox message={error} />
      </div>
    )
  if (!circle)
    return (
      <div className="flex h-screen items-center justify-center">
        <Thinking label="Opening CareCircle" />
      </div>
    )

  const { patient } = circle

  return (
    <div className="min-h-screen">
      <header className="no-print sticky top-0 z-10 border-b border-stone-200/80 bg-white/80 backdrop-blur-md">
        <div className={`${CONTAINER} flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 xl:py-0`}>
          <div className="flex animate-fade-in items-center gap-3 xl:py-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-500 to-brand-700 text-white shadow-md shadow-brand-600/30">
              <HeartHandshake className="h-7 w-7" />
            </span>
            <div>
              <p className="text-xl leading-tight font-bold text-stone-900">CareCircle</p>
              <p className="text-sm text-stone-500">Shared memory for the people who care</p>
            </div>
          </div>

          {/* One row on wide screens; tabs drop to their own row on narrower ones. */}
          <nav className="order-last -mx-2 flex w-full gap-1 self-stretch overflow-x-auto xl:order-none xl:mx-0 xl:w-auto xl:flex-1 xl:justify-center">
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  onClick={() => setTab(id)}
                  className={`group relative flex items-center gap-2 px-4 py-3.5 text-base font-medium whitespace-nowrap transition-colors ${
                    active ? 'text-brand-700' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 transition-transform duration-200 group-hover:scale-110 ${active ? 'scale-110' : ''}`}
                  />
                  {label}
                  <span
                    className={`absolute inset-x-3 bottom-0 h-1 rounded-full bg-brand-600 transition-transform duration-300 ${
                      active ? 'scale-x-100' : 'scale-x-0'
                    }`}
                  />
                </button>
              )
            })}
          </nav>

          <div className="ml-auto flex items-center gap-4 xl:ml-0">
            <div className="flex animate-fade-in items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-lg font-bold text-amber-900">
                {patient.name[0]}
              </div>
              <div>
                <p className="text-base leading-tight font-semibold text-stone-900">
                  {patient.name}, {patient.age}
                </p>
                <p className="text-sm text-stone-500">{patient.conditions.join(' · ')}</p>
              </div>
            </div>

            <label className="flex items-center gap-2 text-base whitespace-nowrap text-stone-500">
              I am
              <select
                value={authorId}
                onChange={(e) => setAuthorId(e.target.value)}
                className="rounded-xl border border-stone-200 bg-white px-3 py-2 text-base text-stone-800 focus:border-brand-500 focus:outline-none"
              >
                {circle.caregivers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name.split(' ')[0]} ({c.role.split(',')[0]})
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </header>

      <main key={tab} className={`${CONTAINER} animate-fade-in py-6`}>
        {tab === 'ask' && <AskPanel circle={circle} />}
        {tab === 'log' && <LogPanel circle={circle} authorId={authorId} />}
        {tab === 'brief' && <BriefPanel circle={circle} />}
        {tab === 'timeline' && <TimelinePanel circle={circle} />}
        {tab === 'profile' && <ProfilePanel circle={circle} />}
      </main>

      <footer className={`${CONTAINER} no-print pb-8 text-sm text-stone-400`}>
        CareCircle coordinates care and remembers — it does not diagnose. In an emergency call 112.
      </footer>
    </div>
  )
}
