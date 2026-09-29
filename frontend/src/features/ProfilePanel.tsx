import { Brain, Database, RefreshCw, Repeat } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

import { api } from '../api/client'
import { Button, Card, CountUp, ErrorBox, MarkdownText, Skeleton, Thinking } from '../components/ui'
import { errorMessage, formatDate } from '../lib/format'
import { useToast } from '../lib/toast'
import type { Circle, ProfileResponse } from '../types'

export function ProfilePanel({ circle }: { circle: Circle }) {
  const [profile, setProfile] = useState<ProfileResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const patientId = circle.patient.id
  const toast = useToast()

  // State is only set once the request settles, so this is safe to call from an effect.
  const load = useCallback(
    () =>
      api
        .profile(patientId)
        .then(setProfile, (e: unknown) => setError(errorMessage(e)))
        .finally(() => setLoading(false)),
    [patientId],
  )

  useEffect(() => {
    void load()
  }, [load])

  async function refresh() {
    setError(null)
    setRefreshing(true)
    try {
      await api.refreshProfile(patientId)
      // Refresh runs in the background on Hindsight; give it a moment before re-reading.
      await new Promise((r) => setTimeout(r, 8000))
      await load()
      toast.show('Care profile updated from the latest memories')
    } catch (e) {
      setError(errorMessage(e))
    } finally {
      setRefreshing(false)
    }
  }

  const first = circle.patient.name.split(' ')[0]

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card className="lg:col-span-2">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-600 text-white">
              <Brain className={`h-7 w-7 ${refreshing ? 'animate-breathe' : ''}`} />
            </span>
            <div>
              <h1 className="text-2xl font-bold text-stone-900">
                What CareCircle has learned about {first}
              </h1>
              <p className="text-sm text-stone-400">
                Hindsight mental model · refreshes as new memories consolidate
                {profile?.last_refreshed_at &&
                  ` · updated ${formatDate(profile.last_refreshed_at)}`}
              </p>
            </div>
          </div>
          <Button variant="ghost" onClick={() => void refresh()} disabled={refreshing}>
            <RefreshCw className={`h-5 w-5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
        {error && <ErrorBox message={error} />}
        {(loading || refreshing) && (
          <>
            <Thinking label={refreshing ? 'Rebuilding the care profile' : 'Loading'} />
            <Skeleton lines={7} />
          </>
        )}
        {!loading && !refreshing && profile?.content && (
          <MarkdownText>{profile.content}</MarkdownText>
        )}
        {!loading && !refreshing && !error && !profile?.content && (
          <p className="text-base text-stone-500">
            The profile has not been built yet. Log a few entries, then press Refresh.
          </p>
        )}
      </Card>

      <div className="stagger space-y-6">
        <Card>
          <p className="flex items-center gap-2 text-sm font-semibold tracking-wider text-stone-400 uppercase">
            <Database className="h-5 w-5" /> Memories
          </p>
          <p className="mt-2 text-5xl font-bold text-brand-700 tabular-nums">
            {profile ? <CountUp value={profile.memory_count} /> : '—'}
          </p>
          <p className="mt-1 text-base text-stone-500">facts retained across the circle</p>
        </Card>
        <Card>
          <p className="flex items-center gap-2 text-lg font-semibold text-stone-800">
            <Repeat className="h-6 w-6 text-brand-600" /> Patterns noticed
          </p>
          <p className="mb-4 text-sm text-stone-400">
            Observations Hindsight consolidated from repeated facts
          </p>
          {profile && profile.patterns.length === 0 && (
            <p className="text-base text-stone-400">None yet.</p>
          )}
          <ul className="stagger space-y-2.5 text-base">
            {profile?.patterns.slice(0, 12).map((p) => (
              <li
                key={p.id}
                className="rounded-xl border-l-4 border-brand-500 bg-brand-50 px-4 py-2.5 text-stone-700"
              >
                {p.text}
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  )
}
