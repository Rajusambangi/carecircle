import {
  Brain,
  CalendarDays,
  ClipboardList,
  HeartHandshake,
  MessageCircleHeart,
  PenLine,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

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
  const navRef = useRef<HTMLElement>(null)
  const indicatorRef = useRef<HTMLSpanElement>(null)

  // Slide the tab underline to the active tab (mutates style directly; no re-render needed).
  useLayoutEffect(() => {
    const place = () => {
      const active = navRef.current?.querySelector<HTMLElement>(`[data-tab="${tab}"]`)
      const bar = indicatorRef.current
      if (!active || !bar) return
      bar.style.width = `${active.offsetWidth - 24}px`
      bar.style.transform = `translateX(${active.offsetLeft + 12}px)`
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [tab, circle])

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
      {/* Soft drifting colour behind everything */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[32rem] w-[32rem] animate-drift rounded-full bg-brand-200/40 blur-3xl" />
        <div className="absolute top-1/3 -right-40 h-[28rem] w-[28rem] animate-drift rounded-full bg-amber-200/40 blur-3xl [animation-delay:-8s]" />
        <div className="absolute -bottom-40 left-1/3 h-[26rem] w-[26rem] animate-drift rounded-full bg-sky-200/30 blur-3xl [animation-delay:-16s]" />
      </div>
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
          <nav
            ref={navRef}
            className="relative order-last -mx-2 flex w-full gap-1 self-stretch overflow-x-auto xl:order-none xl:mx-0 xl:w-auto xl:flex-1 xl:justify-center"
          >
            {TABS.map(({ id, label, icon: Icon }) => {
              const active = tab === id
              return (
                <button
                  key={id}
                  data-tab={id}
                  onClick={() => setTab(id)}
                  className={`group relative flex items-center gap-2 px-4 py-3.5 text-base font-medium whitespace-nowrap transition-colors ${
                    active ? 'text-brand-700' : 'text-stone-500 hover:text-stone-900'
                  }`}
                >
                  <Icon
                    className={`h-6 w-6 transition-transform duration-200 group-hover:scale-110 ${active ? 'scale-110' : ''}`}
                  />
                  {label}
                </button>
              )
            })}
            <span
              ref={indicatorRef}
              aria-hidden
              className="absolute bottom-0 left-0 h-1 rounded-full bg-gradient-to-r from-brand-500 to-brand-700 transition-all duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
            />
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

      <main className={`${CONTAINER} py-6`}>
        {/* Ask and Log keep their state across tab switches; the rest reload fresh data. */}
        <div className={tab === 'ask' ? 'animate-fade-in' : 'hidden'}>
          <AskPanel circle={circle} authorId={authorId} />
        </div>
        <div className={tab === 'log' ? 'animate-fade-in' : 'hidden'}>
          <LogPanel circle={circle} authorId={authorId} />
        </div>
        <div key={tab} className="animate-fade-in">
          {tab === 'brief' && <BriefPanel circle={circle} />}
          {tab === 'timeline' && <TimelinePanel circle={circle} />}
          {tab === 'profile' && <ProfilePanel circle={circle} />}
        </div>
      </main>

      {tab !== 'ask' && (
        <footer className={`${CONTAINER} no-print pb-8 text-sm text-stone-400`}>
          CareCircle coordinates care and remembers — it does not diagnose. In an emergency call
          112.
        </footer>
      )}
    </div>
  )
}
