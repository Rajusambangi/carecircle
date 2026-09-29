import { useCallback, useEffect, useRef, useState } from 'react'

// Minimal Web Speech API types (not in TypeScript's DOM lib).
interface SpeechResult {
  isFinal: boolean
  0: { transcript: string }
}
interface SpeechEvent {
  resultIndex: number
  results: ArrayLike<SpeechResult>
}
interface Recognition {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((e: SpeechEvent) => void) | null
  onend: (() => void) | null
  onerror: ((e: { error: string }) => void) | null
  start: () => void
  stop: () => void
}
type RecognitionCtor = new () => Recognition

const Ctor: RecognitionCtor | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as Record<string, RecognitionCtor | undefined>).SpeechRecognition ??
      (window as unknown as Record<string, RecognitionCtor | undefined>).webkitSpeechRecognition)

export const SPEECH_LANGS = [
  { code: 'en-IN', label: 'English' },
  { code: 'hi-IN', label: 'हिंदी' },
  { code: 'mr-IN', label: 'मराठी' },
] as const

interface SpeechOptions {
  /** Called once the speaker goes quiet for `pauseMs` after saying something. */
  onPause?: () => void
  pauseMs?: number
}

/** Browser speech-to-text. Calls `onFinal` with each finished phrase. */
export function useSpeech(onFinal: (text: string) => void, options: SpeechOptions = {}) {
  const { onPause, pauseMs = 1800 } = options
  const [listening, setListening] = useState(false)
  const [interim, setInterim] = useState('')
  const [pausing, setPausing] = useState(false)
  const [tick, setTick] = useState(0) // bumps on every result, to restart countdown UIs
  const [error, setError] = useState<string | null>(null)
  const rec = useRef<Recognition | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heard = useRef(false)
  const autoStopped = useRef(false)
  const onFinalRef = useRef(onFinal)
  const onPauseRef = useRef(onPause)

  useEffect(() => {
    onFinalRef.current = onFinal
    onPauseRef.current = onPause
  }, [onFinal, onPause])

  const clearTimer = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  useEffect(
    () => () => {
      clearTimer()
      rec.current?.stop()
    },
    [],
  )

  const start = useCallback(
    (lang: string) => {
      if (!Ctor) return
      const r = new Ctor()
      r.lang = lang
      r.continuous = true
      r.interimResults = true
      heard.current = false
      autoStopped.current = false
      r.onresult = (e) => {
        let live = ''
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i]
          if (res.isFinal) onFinalRef.current(res[0].transcript.trim())
          else live += res[0].transcript
        }
        setInterim(live)
        setTick((t) => t + 1)
        heard.current = true
        // Any new speech restarts the silence countdown.
        clearTimer()
        setPausing(false)
        if (onPauseRef.current) {
          timer.current = setTimeout(() => {
            autoStopped.current = true
            r.stop() // flushes any pending phrase as final, then fires onend
          }, pauseMs)
          setPausing(true)
        }
      }
      r.onerror = (e) =>
        setError(e.error === 'not-allowed' ? 'Microphone permission denied' : e.error)
      r.onend = () => {
        clearTimer()
        setListening(false)
        setPausing(false)
        setInterim('')
        if (autoStopped.current && heard.current) onPauseRef.current?.()
      }
      rec.current = r
      setError(null)
      setListening(true)
      r.start()
    },
    [pauseMs],
  )

  const stop = useCallback(() => {
    clearTimer()
    rec.current?.stop()
  }, [])

  return {
    supported: Boolean(Ctor),
    listening,
    interim,
    pausing,
    pauseMs,
    tick,
    error,
    start,
    stop,
  }
}
