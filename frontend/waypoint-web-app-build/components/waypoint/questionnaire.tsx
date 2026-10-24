'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AlertCircle, ArrowLeft, ArrowRight, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Skeleton } from '@/components/ui/skeleton'
import { StatusPanel } from './status-panel'
import { fetchQuestions } from '@/lib/waypoint/api'
import { isAnswered } from '@/lib/waypoint/answers'
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
  const {
    data: questions,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR(['questions', lifeEvent.id] as const, fetchQuestions, {
    revalidateOnFocus: false,
    shouldRetryOnError: false,
  })
  const [answers, setAnswers] = useState<Answers>(initialAnswers ?? {})

  const header = (
    <>
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
    </>
  )

  if (isLoading) {
    return (
      <section aria-labelledby="questions-heading" aria-busy="true">
        {header}
        <div className="mt-10 flex flex-col gap-8" aria-hidden="true">
          <Skeleton className="h-40 w-full rounded-2xl" />
          <Skeleton className="h-40 w-full rounded-2xl" />
        </div>
        <p className="sr-only" aria-live="polite">
          Loading questions…
        </p>
      </section>
    )
  }

  if (error || !questions) {
    return (
      <StatusPanel
        icon={<AlertCircle className="size-6" aria-hidden="true" />}
        tone="error"
        title="We couldn't load the questions"
        message={error?.message ?? 'Something went wrong on our side. Please try again.'}
      >
        <Button size="lg" className="h-11 px-5" onClick={() => mutate()} disabled={isValidating}>
          <RotateCw data-icon="inline-start" aria-hidden="true" />
          Retry
        </Button>
        <Button variant="ghost" size="lg" className="h-11 px-5" onClick={onBack}>
          Choose a different situation
        </Button>
      </StatusPanel>
    )
  }

  const answeredCount = questions.filter((q) => isAnswered(q, answers)).length
  const isComplete = answeredCount === questions.length

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isComplete || !questions) return
    // Only send answers to questions the server asked, so stale keys never trigger a 400.
    const payload: Answers = {}
    for (const question of questions) {
      if (question.key in answers) payload[question.key] = answers[question.key]
    }
    onContinue(payload)
  }

  function toggleMulti(key: string, value: string, checked: boolean) {
    setAnswers((prev) => {
      const current = Array.isArray(prev[key]) ? (prev[key] as string[]) : []
      const next = checked ? [...new Set([...current, value])] : current.filter((v) => v !== value)
      return { ...prev, [key]: next }
    })
  }

  return (
    <section aria-labelledby="questions-heading">
      {header}

      <form onSubmit={handleSubmit} className="mt-10 flex flex-col gap-8">
        {questions.length === 0 && (
          <p className="rounded-2xl border border-border bg-card p-6 text-pretty text-muted-foreground shadow-xs">
            No questions needed for this situation — continue to see your steps.
          </p>
        )}

        {questions.map((question, index) => (
          <fieldset
            key={question.key}
            className="rounded-2xl border border-border bg-card p-6 shadow-xs"
          >
            <legend className="sr-only">{question.label}</legend>
            <p aria-hidden="true" className="flex items-baseline gap-3 font-medium">
              <span className="text-sm text-muted-foreground tabular-nums">{index + 1}.</span>
              <span className="text-pretty">{question.label}</span>
            </p>
            {question.type === 'multi' ? (
              <div className="mt-4 grid w-full gap-2 sm:grid-cols-2">
                <p className="text-sm text-muted-foreground sm:col-span-2">Select all that apply.</p>
                {question.options.map((option) => {
                  const optionId = `${question.key}-${option.value}`
                  const selected = answers[question.key]
                  const checked = Array.isArray(selected) && selected.includes(option.value)
                  return (
                    <label
                      key={option.value}
                      htmlFor={optionId}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-border px-4 py-3 text-sm transition-colors hover:bg-muted has-checked:border-primary/50 has-checked:bg-accent"
                    >
                      <input
                        id={optionId}
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => toggleMulti(question.key, option.value, e.target.checked)}
                        className="size-4 shrink-0 accent-primary"
                      />
                      {option.label}
                    </label>
                  )
                })}
              </div>
            ) : (
              <RadioGroup
                value={(answers[question.key] as string | undefined) ?? ''}
                onValueChange={(value) =>
                  setAnswers((prev) => ({ ...prev, [question.key]: value as string }))
                }
                aria-label={question.label}
                className="mt-4 gap-2 sm:grid-cols-2"
              >
                {question.options.map((option) => {
                  const optionId = `${question.key}-${option.value}`
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
            )}
          </fieldset>
        ))}

        <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-center text-sm text-muted-foreground sm:text-left" aria-live="polite">
            {questions.length > 0 && `${answeredCount} of ${questions.length} answered`}
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
