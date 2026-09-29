// Mirrors backend/src/carecircle/schemas.py

export type EventType =
  | 'symptom'
  | 'vitals'
  | 'medication_change'
  | 'medication_taken'
  | 'reaction'
  | 'appointment'
  | 'doctor_instruction'
  | 'test_result'
  | 'fall'
  | 'mood'
  | 'meal'
  | 'activity'
  | 'preference'
  | 'emergency'
  | 'note'

export interface Person {
  id: string
  name: string
  role: string
  last_seen?: string | null
}

export interface Doctor extends Person {
  specialty: string
  clinic: string
}

export interface Patient {
  id: string
  name: string
  age: number
  city: string
  conditions: string[]
  background: string
}

export interface Circle {
  patient: Patient
  caregivers: Person[]
  doctors: Doctor[]
}

export interface CareEvent {
  patient_id: string
  author_id: string
  occurred_at: string
  type: EventType
  severity: 'low' | 'medium' | 'high'
  text: string
  summary: string | null
  entities: string[]
}

export interface SafetyAlert {
  level: 'emergency'
  message: string
  matched: string[]
}

export interface Alert {
  title: string
  detail: string
  severity: 'info' | 'warning' | 'urgent'
  related_dates: string[]
}

export interface Source {
  text: string
  date: string | null
  type: string | null
  context?: string | null
}

export interface DateCheck {
  mention: string
  supported: boolean
}

export interface LearnedFact {
  text: string
  type: string | null
  entities: string[]
}

export interface Checkpoint {
  id: string
  label: string
  until: string | null
  description: string
  memory_count: number | null
}

export interface Digest {
  headline: string
  updates: {
    date: string
    text: string
    reported_by?: string | null
    importance: 'high' | 'medium' | 'low'
  }[]
  action_items: string[]
}

export interface DigestResponse {
  caregiver: string
  since: string
  digest: Digest | null
  raw_text: string | null
}

export interface LogResponse {
  event: CareEvent
  safety: SafetyAlert | null
  alerts: Alert[]
  alerts_error: string | null
  learned: LearnedFact[]
}

export interface AskResponse {
  answer: string
  used_memory: boolean
  checkpoint: string | null
  sources: Source[]
  date_checks: DateCheck[]
  safety: SafetyAlert | null
}

export interface Brief {
  headline: string
  since_last_visit: { date: string; item: string; reported_by?: string | null }[]
  medication_changes: { date: string; change: string; observed_after?: string | null }[]
  trends: string[]
  pending_followups: string[]
  questions_for_doctor: string[]
  care_notes: string[]
}

export interface BriefResponse {
  patient: string
  doctor: string
  specialty: string
  since: string | null
  visit_date: string | null
  brief: Brief | null
  raw_text: string | null
  sources: Source[]
}

export interface TimelineItem {
  id: string
  text: string
  date: string | null
  fact_type: string | null
  tags: string[]
}

export interface ProfileResponse {
  patient_id: string
  content: string | null
  last_refreshed_at: string | null
  patterns: TimelineItem[]
  memory_count: number
}
