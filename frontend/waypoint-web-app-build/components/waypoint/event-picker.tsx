'use client'

import { useState } from 'react'
import { ArrowRight, Flower2, Loader2, Sparkles, WalletCards } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { fetchIntake } from '@/lib/waypoint/api'
import { LIFE_EVENTS } from '@/lib/waypoint/data'
import type { Answers, EventId } from '@/lib/waypoint/types'

const EVENT_ICONS = {
  death: Flower2,
  lost_documents: WalletCards,
} satisfies Record<EventId, typeof Flower2>

const MAX_PROMPT_CHARS = 1000

type EventPickerProps = {
  onSelect: (event: EventId) => void
  onIntake: (event: EventId, answers: Answers) => Promise<void>
}

export function EventPicker({ onSelect, onIntake }: EventPickerProps) {
  return (
    <section aria-labelledby="picker-heading">
      <div className="max-w-xl">
        <h1
          id="picker-heading"
          className="font-serif text-3xl leading-tight font-medium text-balance md:text-4xl"
        >
          What are you dealing with right now?
        </h1>
        <p className="mt-3 text-pretty text-muted-foreground leading-relaxed">
          Tell us in your own words, or choose a situation below. We&apos;ll ask a few short
          questions, then lay out your next steps in the order they need to happen.
        </p>
      </div>

      <IntakeForm onIntake={onIntake} />

      <p className="mt-10 text-sm font-medium text-muted-foreground">Or choose a situation</p>
      <ul className="mt-4 grid gap-4 md:grid-cols-2">
        {LIFE_EVENTS.map((event) => {
          const Icon = EVENT_ICONS[event.id]
          return (
            <li key={event.id}>
              <button
                type="button"
                onClick={() => onSelect(event.id)}
                className="group flex h-full min-h-56 w-full flex-col rounded-2xl border border-border bg-card p-7 text-left shadow-xs transition-all outline-none hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50"
              >
                <span className="flex size-12 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <Icon className="size-6" aria-hidden="true" />
                </span>
                <span className="mt-6 font-serif text-2xl leading-snug font-medium text-balance">
                  {event.title}
                </span>
                <span className="mt-2 text-pretty text-sm leading-relaxed text-muted-foreground">
                  {event.description}
                </span>
                <span className="mt-auto flex items-center gap-1.5 pt-6 text-sm font-medium text-primary">
                  Get started
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function IntakeForm({ onIntake }: Pick<EventPickerProps, 'onIntake'>) {
  const [prompt, setPrompt] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading'>('idle')
  const [message, setMessage] = useState<{ tone: 'error' | 'info'; text: string } | null>(null)
  const trimmed = prompt.trim()

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!trimmed || status === 'loading') return

    setStatus('loading')
    setMessage(null)
    try {
      const result = await fetchIntake(trimmed)
      if (!result.event) {
        setMessage({
          tone: 'info',
          text: result.aiAvailable
            ? "We couldn't tell which situation this is. Try adding a little more detail, or choose one below."
            : "We can't read descriptions right now. Please choose your situation below.",
        })
        return
      }
      await onIntake(result.event, result.answers)
    } catch (error) {
      setMessage({
        tone: 'error',
        text: error instanceof Error ? error.message : 'Something went wrong. Please try again.',
      })
    } finally {
      setStatus('idle')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-8 rounded-2xl border border-border bg-card p-5 shadow-xs"
      aria-busy={status === 'loading'}
    >
      <label htmlFor="intake-prompt" className="flex items-center gap-2 font-medium">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        Describe what happened
      </label>
      <textarea
        id="intake-prompt"
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) e.currentTarget.form?.requestSubmit()
        }}
        maxLength={MAX_PROMPT_CHARS}
        rows={3}
        placeholder="For example: I lost my wallet with my PAN card and driving licence in it."
        disabled={status === 'loading'}
        className="mt-3 w-full resize-y rounded-xl border border-input bg-background px-4 py-3 text-sm leading-relaxed outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
      />
      <div className="mt-3 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p
          aria-live="polite"
          className={
            message?.tone === 'error'
              ? 'text-sm text-destructive'
              : 'text-sm text-muted-foreground'
          }
        >
          {message?.text ?? (status === 'loading' ? 'Working out your situation…' : '')}
        </p>
        <Button
          type="submit"
          size="lg"
          disabled={!trimmed || status === 'loading'}
          className="h-11 shrink-0 px-5"
        >
          {status === 'loading' ? (
            <Loader2 data-icon="inline-start" className="animate-spin" aria-hidden="true" />
          ) : null}
          Continue
          {status === 'loading' ? null : <ArrowRight data-icon="inline-end" aria-hidden="true" />}
        </Button>
      </div>
    </form>
  )
}
