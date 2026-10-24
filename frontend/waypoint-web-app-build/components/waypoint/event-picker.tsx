import { ArrowRight, Flower2, WalletCards } from 'lucide-react'
import { LIFE_EVENTS } from '@/lib/waypoint/data'
import type { EventId } from '@/lib/waypoint/types'

const EVENT_ICONS = {
  death: Flower2,
  lost_documents: WalletCards,
} satisfies Record<EventId, typeof Flower2>

export function EventPicker({ onSelect }: { onSelect: (event: EventId) => void }) {
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
          Choose a situation. We&apos;ll ask a few short questions, then lay out your next steps
          in the order they need to happen.
        </p>
      </div>

      <ul className="mt-10 grid gap-4 md:grid-cols-2">
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
