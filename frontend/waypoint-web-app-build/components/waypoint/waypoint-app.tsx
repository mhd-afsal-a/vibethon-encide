'use client'

import { useState } from 'react'
import { Signpost } from 'lucide-react'
import { EventPicker } from './event-picker'
import { Questionnaire } from './questionnaire'
import { Results } from './results'
import { getLifeEvent } from '@/lib/waypoint/data'
import type { Answers, EventId } from '@/lib/waypoint/types'

type Screen =
  | { name: 'select' }
  | { name: 'questions'; event: EventId; answers?: Answers }
  | { name: 'results'; event: EventId; answers: Answers }

const STAGES = ['select', 'questions', 'results'] as const

export function WaypointApp() {
  const [screen, setScreen] = useState<Screen>({ name: 'select' })
  const stageIndex = STAGES.indexOf(screen.name)

  function startOver() {
    setScreen({ name: 'select' })
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-border/70">
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between px-5">
          <button
            type="button"
            onClick={startOver}
            className="flex items-center gap-2 rounded-md text-foreground outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Signpost className="size-4" aria-hidden="true" />
            </span>
            <span className="font-serif text-xl font-medium tracking-tight">Waypoint</span>
          </button>
          <ol className="flex items-center gap-1.5" aria-label="Progress">
            {STAGES.map((stage, index) => (
              <li
                key={stage}
                aria-current={index === stageIndex ? 'step' : undefined}
                className={
                  index <= stageIndex
                    ? 'h-1.5 w-6 rounded-full bg-primary transition-colors'
                    : 'h-1.5 w-6 rounded-full bg-border transition-colors'
                }
              >
                <span className="sr-only">
                  Step {index + 1} of {STAGES.length}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-5 py-10 md:py-14">
        {screen.name === 'select' && (
          <EventPicker onSelect={(event) => setScreen({ name: 'questions', event })} />
        )}

        {screen.name === 'questions' && (
          <Questionnaire
            key={screen.event}
            lifeEvent={getLifeEvent(screen.event)!}
            initialAnswers={screen.answers}
            onBack={startOver}
            onContinue={(answers) =>
              setScreen({ name: 'results', event: screen.event, answers })
            }
          />
        )}

        {screen.name === 'results' && (
          <Results
            event={screen.event}
            answers={screen.answers}
            onEditAnswers={() =>
              setScreen({ name: 'questions', event: screen.event, answers: screen.answers })
            }
            onStartOver={startOver}
          />
        )}
      </main>

      <footer className="border-t border-border/70">
        <p className="mx-auto w-full max-w-3xl px-5 py-5 text-center text-sm text-muted-foreground">
          Guidance, not legal advice. Confirm with the office.
        </p>
      </footer>
    </div>
  )
}
