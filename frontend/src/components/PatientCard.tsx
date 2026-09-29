import { Brain, Database, HeartPulse, MapPin, Stethoscope, Users, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { api } from '../api/client'
import { formatDate } from '../lib/format'
import type { Circle, ProfileResponse } from '../types'
import { CountUp, MarkdownText, Skeleton } from './ui'

/** First "## Current medications" section of the care-profile markdown, if present. */
function medicationsSection(markdown: string | null): string | null {
  if (!markdown) return null
  const match = markdown.match(/##\s*Current medications[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i)
  return match ? match[1].trim() : null
}

interface Props {
  circle: Circle
  onOpenProfile: () => void
}

/** Header patient chip; click for an intro card about the person being cared for. */
export function PatientCard({ circle, onOpenProfile }: Props) {
  const [open, setOpen] = useState(false)
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const { patient, caregivers, doctors } = circle

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  function show() {
    setOpen(true)
    if (profile || loading) return
    setLoading(true)
    api
      .profile(patient.id)
      .then(setProfile)
      .catch(() => setProfile(null))
      .finally(() => setLoading(false))
  }

  const meds = medicationsSection(profile?.content ?? null)

  return (
    <>
      <button
        onClick={show}
        title={`About ${patient.name}`}
        className="group flex animate-fade-in items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 py-2 text-left transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
      >
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-lg font-bold text-amber-900 transition-transform group-hover:scale-110">
          {patient.name[0]}
        </div>
        <div>
          <p className="text-base leading-tight font-semibold text-stone-900">{patient.name}</p>
          <p className="text-sm text-stone-500">
            {patient.age} · {patient.city}
          </p>
        </div>
      </button>

      {/* Mounted only while open so the entrance animations replay each time. */}
      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-50 flex animate-fade-in items-center justify-center p-6"
            role="dialog"
            aria-modal="true"
            aria-label={`About ${patient.name}`}
          >
            <div
              className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
              onClick={() => setOpen(false)}
            />
            <div className="relative max-h-[90vh] w-full max-w-4xl animate-pop overflow-y-auto rounded-3xl bg-white shadow-2xl">
              {/* Hero */}
              <div className="relative overflow-hidden rounded-t-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-brand-900 px-8 pt-8 pb-7 text-white">
                <div className="absolute -top-16 -right-16 h-56 w-56 animate-drift rounded-full bg-white/10 blur-2xl" />
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close"
                  className="absolute top-5 right-5 rounded-xl p-2 text-white/70 transition hover:rotate-90 hover:bg-white/10 hover:text-white"
                >
                  <X className="h-6 w-6" />
                </button>
                <div className="relative flex items-center gap-5">
                  <div className="flex h-20 w-20 shrink-0 animate-pop items-center justify-center rounded-3xl bg-gradient-to-br from-amber-200 to-amber-400 text-4xl font-bold text-amber-900 shadow-lg">
                    {patient.name[0]}
                  </div>
                  <div>
                    <h2 className="text-3xl font-bold">{patient.name}</h2>
                    <p className="mt-1 flex items-center gap-2 text-lg text-brand-100">
                      {patient.age} years <MapPin className="ml-2 h-4 w-4" /> {patient.city}
                    </p>
                  </div>
                </div>
                <div className="relative mt-5 flex flex-wrap gap-2">
                  {patient.conditions.map((c, i) => (
                    <span
                      key={c}
                      style={{ animationDelay: `${200 + i * 80}ms` }}
                      className="flex animate-pop items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-medium backdrop-blur"
                    >
                      <HeartPulse className="h-4 w-4" /> {c}
                    </span>
                  ))}
                </div>
              </div>

              <div className="grid gap-6 p-8 md:grid-cols-5">
                <div className="space-y-6 md:col-span-3">
                  <section className="animate-fade-up">
                    <h3 className="mb-2 text-sm font-bold tracking-wider text-brand-700 uppercase">
                      About {patient.name.split(' ')[0]}
                    </h3>
                    <p className="text-base leading-relaxed text-stone-700">{patient.background}</p>
                  </section>

                  <section className="animate-fade-up [animation-delay:100ms]">
                    <h3 className="mb-2 flex items-center gap-2 text-sm font-bold tracking-wider text-brand-700 uppercase">
                      <Brain className="h-4 w-4" /> Current medications
                      <span className="font-normal tracking-normal text-stone-400 normal-case">
                        — from memory
                      </span>
                    </h3>
                    {loading && <Skeleton lines={4} />}
                    {!loading && meds && <MarkdownText>{meds}</MarkdownText>}
                    {!loading && !meds && (
                      <p className="text-base text-stone-400">
                        Not built yet — refresh the care profile after seeding.
                      </p>
                    )}
                  </section>
                </div>

                <div className="space-y-5 md:col-span-2">
                  <section className="animate-slide-in rounded-2xl border border-stone-200 p-5 [animation-delay:120ms]">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-stone-500 uppercase">
                      <Users className="h-4 w-4" /> Care circle
                    </h3>
                    <ul className="space-y-3">
                      {caregivers.map((c) => (
                        <li key={c.id} className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-700">
                            {c.name[0]}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-stone-900">{c.name}</p>
                            <p className="text-sm text-stone-500">
                              {c.role}
                              {c.last_seen && ` · active ${formatDate(c.last_seen)}`}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <section className="animate-slide-in rounded-2xl border border-stone-200 p-5 [animation-delay:200ms]">
                    <h3 className="mb-3 flex items-center gap-2 text-sm font-bold tracking-wider text-stone-500 uppercase">
                      <Stethoscope className="h-4 w-4" /> Doctors
                    </h3>
                    <ul className="space-y-3">
                      {doctors.map((d) => (
                        <li key={d.id}>
                          <p className="font-medium text-stone-900">{d.name}</p>
                          <p className="text-sm text-stone-500">
                            {d.specialty} · {d.clinic}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </section>

                  <div className="flex animate-slide-in items-center gap-3 rounded-2xl bg-brand-50 p-5 [animation-delay:280ms]">
                    <Database className="h-8 w-8 text-brand-600" />
                    <div>
                      <p className="text-3xl font-bold text-brand-700 tabular-nums">
                        {profile ? <CountUp value={profile.memory_count} /> : '—'}
                      </p>
                      <p className="text-sm text-stone-500">memories shared by the circle</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 border-t border-stone-100 px-8 py-5">
                <button
                  onClick={() => setOpen(false)}
                  className="rounded-2xl px-5 py-2.5 text-base font-medium text-stone-600 transition hover:bg-stone-100"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setOpen(false)
                    onOpenProfile()
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-brand-600 px-5 py-2.5 text-base font-medium text-white shadow-md shadow-brand-600/30 transition hover:-translate-y-0.5 hover:bg-brand-700"
                >
                  <Brain className="h-5 w-5" /> Open full care profile
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  )
}
