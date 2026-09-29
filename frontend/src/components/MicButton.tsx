import { Mic, Square } from 'lucide-react'
import { useState } from 'react'

import { SPEECH_LANGS, useSpeech } from '../lib/speech'

interface Props {
  onTranscript: (text: string) => void
  /** If set, called after the speaker pauses (hands-free send). */
  onPause?: () => void
  size?: 'md' | 'lg'
}

/** Tap to dictate in English, Hindi or Marathi; shows live words while listening. */
export function MicButton({ onTranscript, onPause, size = 'md' }: Props) {
  const [lang, setLang] = useState<string>(SPEECH_LANGS[0].code)
  const { supported, listening, interim, pausing, pauseMs, tick, error, start, stop } = useSpeech(
    onTranscript,
    { onPause },
  )

  if (!supported) return null
  const dim = size === 'lg' ? 'h-12 w-12' : 'h-10 w-10'

  return (
    <div className="relative flex items-center gap-1.5">
      {(listening || error) && (
        <div className="absolute right-0 bottom-full mb-3 w-72 animate-fade-up rounded-2xl border border-stone-200 bg-white px-4 py-3 text-left shadow-xl">
          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : (
            <>
              <div className="mb-1 flex items-center gap-2 text-sm font-medium text-red-600">
                <span className="flex h-4 items-end gap-0.5">
                  {[0, 120, 240, 360].map((d) => (
                    <span
                      key={d}
                      className="w-1 animate-dot rounded-full bg-red-500"
                      style={{ height: '100%', animationDelay: `${d}ms` }}
                    />
                  ))}
                </span>
                Listening…
              </div>
              <p className="min-h-6 text-base text-stone-600 italic">{interim || 'Speak now'}</p>
              {onPause && (
                <div className="mt-2">
                  <div className="h-1 overflow-hidden rounded-full bg-stone-100">
                    {pausing && (
                      // Re-keyed on every new result so the countdown restarts.
                      <div
                        key={tick}
                        className="h-full origin-left rounded-full bg-brand-500"
                        style={{ animation: `grow ${pauseMs}ms linear both` }}
                      />
                    )}
                  </div>
                  <p className="mt-1 text-xs text-stone-400">
                    {pausing ? 'Pause to send…' : 'Sends automatically when you pause'}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
      <select
        value={lang}
        onChange={(e) => setLang(e.target.value)}
        disabled={listening}
        aria-label="Dictation language"
        className="rounded-xl bg-transparent py-1 text-sm text-stone-500 outline-none hover:text-stone-800"
      >
        {SPEECH_LANGS.map((l) => (
          <option key={l.code} value={l.code}>
            {l.label}
          </option>
        ))}
      </select>
      <button
        type="button"
        onClick={() => (listening ? stop() : start(lang))}
        aria-label={listening ? 'Stop dictation' : 'Dictate'}
        className={`relative flex ${dim} shrink-0 items-center justify-center rounded-2xl transition-all duration-200 active:scale-90 ${
          listening
            ? 'bg-red-500 text-white shadow-lg shadow-red-500/40'
            : 'bg-stone-100 text-stone-600 hover:bg-brand-50 hover:text-brand-700'
        }`}
      >
        {listening && (
          <span className="absolute inset-0 animate-ping rounded-2xl bg-red-400/50 [animation-duration:1.4s]" />
        )}
        {listening ? <Square className="relative h-5 w-5" /> : <Mic className="h-5 w-5" />}
      </button>
    </div>
  )
}
