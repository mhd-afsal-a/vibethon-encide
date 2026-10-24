'use client'

import { useState } from 'react'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import type { Answers, LifeEvent } from '@/lib/waypoint/types'

type QuestionnaireProps = {
  lifeEvent: LifeEvent
  initialAnswers?: Answers
  onBack: () => void
  onContinue: (answers: Answers) => void
}

export function Questionnaire({
  lifeEvent,
  initialAnswers,
  onBack,
  onContinue,
}: QuestionnaireProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {})
  const answeredCount = lifeEvent.questions.filter((q) => answers[q.id]).length
  const isComplete = answeredCount === lifeEvent.questions.length

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isComplete) onContinue(answers)
  }

  return (
    <section aria-labelledby="questions-heading">
      <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2.5 text-muted-foreground">
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Choose a different situation
      </Button>

      <div className="mt-6 max-w-xl">
        <p className="text-sm font-medium text-primary">{lifeEvent.title}</p>
        <h1
          id="questions-heading"
          className="mt-2 font-serif text-3xl leading-tight font-medium text-balance md:text-4xl"
        >
          A few quick questions
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          Your answers help us put the steps in the right order. Take your time.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-8">
        {lifeEvent.questions.map((question, index) => (
          <fieldset
            key={question.id}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs"
          >
            <legend className="sr-only">{question.prompt}</legend>
            <p aria-hidden="true" className="flex items-baseline gap-3 font-medium">
              <span className="text-sm text-muted-foreground tabular-nums">{index + 1}.</span>
              <span className="text-pretty">{question.prompt}</span>
            </p>
            <RadioGroup
              value={answers[question.id] ?? ''}
              onValueChange={(value) =>
                setAnswers((prev) => ({ ...prev, [question.id]: value as string }))
              }
              aria-label={question.prompt}
              className="mt-4 gap-2 sm:grid-cols-2"
            >
              {question.options.map((option) => {
                const optionId = `${question.id}-${option.value}`
                return (
                  <label
                    key={option.value}
                    htmlFor={optionId}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted has-data-checked:border-primary/50 has-data-checked:bg-accent"
                  >
                    <RadioGroupItem id={optionId} value={option.value} />
                    {option.label}
                  </label>
                )
              })}
            </RadioGroup>
          </fieldset>
        ))}

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left" aria-live="polite">
            {answeredCount} of {lifeEvent.questions.length} answered
          </p>
          <Button type="submit" size="lg" disabled={!isComplete} className="h-11 px-5">
            Continue
            <ArrowRight data-icon="inline-end" aria-hidden="true" />
          </Button>
        </div>
      </form>
    </section>
  )
}
