import type {
  AskResponse,
  BriefResponse,
  Circle,
  LogResponse,
  ProfileResponse,
  TimelineItem,
} from '../types'

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...init,
  })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    const detail = typeof body?.detail === 'string' ? body.detail : res.statusText
    throw new ApiError(res.status, detail)
  }
  return res.json() as Promise<T>
}

const post = <T>(path: string, body: unknown) =>
  request<T>(path, { method: 'POST', body: JSON.stringify(body) })

export const api = {
  circle: () => request<Circle>('/circle'),

  log: (body: { text: string; author_id: string; patient_id: string; occurred_at?: string }) =>
    post<LogResponse>('/log', body),

  ask: (body: { question: string; patient_id: string; use_memory: boolean }) =>
    post<AskResponse>('/ask', body),

  brief: (body: { patient_id: string; doctor_id: string; since?: string; visit_date?: string }) =>
    post<BriefResponse>('/brief', body),

  timeline: (patientId: string, q?: string) =>
    request<TimelineItem[]>(
      `/timeline?${new URLSearchParams({ patient_id: patientId, ...(q ? { q } : {}) })}`,
    ),

  profile: (patientId: string) => request<ProfileResponse>(`/profile?patient_id=${patientId}`),

  refreshProfile: (patientId: string) =>
    post<{ status: string }>(`/profile/refresh?patient_id=${patientId}`, {}),
}
