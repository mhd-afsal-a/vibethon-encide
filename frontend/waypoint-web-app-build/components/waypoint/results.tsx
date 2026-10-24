'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { AlertCircle, ArrowLeft, Compass, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StepFlowchart } from './step-flowchart'
import { StepDetailSheet } from './step-detail-sheet'
import { fetchPlan } from '@/lib/waypoint/api'
import { getLifeEvent } from '@/lib/waypoint/data'
import type { Answers, EventId, Step } from '@/lib/waypoint/types'

type ResultsProps = {
  event: EventId
  answers: Answers
  onEditAnswers: () => void
  onStartOver: () => void
}

export function Results({ event, answers, onEditAnswers, onStartOver }: ResultsProps) {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    ['plan', event, answers] as const,
    fetchPlan,
    { revalidateOnFocus: false, shouldRetryOnError: false },
  )
  const [selectedStep, setSelectedStep] = useState<Step | null>(null)
  const lifeEvent = getLifeEvent(event)

  if (isLoading) return <LoadingState />

  if (error && !data) {
    return (
      <StatusPanel
        icon={<AlertCircle className="size-6" aria-hidden="true" />}
        tone="error"
        title="We couldn't load your steps"
        message="Something went wrong on our side. Your answers are saved — please try again."
      >
        <Button size="lg" className="h-11 px-5" onClick={() => mutate()} disabled={isValidating}>
          <RotateCw data-icon="inline-start" aria-hidden="true" />
          Retry
        </Button>
        <Button variant="ghost" size="lg" className="h-11 px-5" onClick={onEditAnswers}>
          Edit answers
        </Button>
      </StatusPanel>
    )
  }

  if (!data) return null

  if (data.tier === 'unsupported') {
    return (
      <StatusPanel
        icon={<Compass className="size-6" aria-hidden="true" />}
        title="Not supported yet"
        message={`We don't have verified guidance for “${lifeEvent?.title.toLowerCase()}” yet. We add new situations only once every step has been checked with the offices involved.`}
      >
        <Button size="lg" className="h-11 px-5" onClick={onStartOver}>
          Choose another situation
        </Button>
      </StatusPanel>
    )
  }

  return (
    <section aria-labelledby="results-heading">
      <Button
        variant="ghost"
        size="sm"
        onClick={onEditAnswers}
        className="-ml-2.5 text-muted-foreground"
      >
        <ArrowLeft data-icon="inline-start" aria-hidden="true" />
        Edit answers
      </Button>

      <div className="mt-6 max-w-xl">
        <p className="text-sm font-medium text-primary">{lifeEvent?.title}</p>
        <h1
          id="results-heading"
          className="mt-2 font-serif text-3xl leading-tight font-medium text-balance md:text-4xl"
        >
          Your next steps
        </h1>
        <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">
          {data.steps.length} steps, in the order they need to happen. Select a step to see what to
          bring, where to go, and what it costs.
        </p>
      </div>

      <div className="mt-10">
        <StepFlowchart
          steps={data.steps}
          selectedId={selectedStep?.id}
          onSelect={setSelectedStep}
        />
      </div>

      <StepDetailSheet
        step={selectedStep}
        allSteps={data.steps}
        onOpenChange={(open) => {
          if (!open) setSelectedStep(null)
        }}
      />
    </section>
  )
}

function LoadingState() {
  return (
    <section aria-busy="true" aria-live="polite">
      <div className="max-w-xl">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="mt-4 h-9 w-64" />
        <p className="mt-4 text-muted-foreground">Preparing your steps…</p>
      </div>
      <div className="mt-10 flex flex-col items-center gap-10" aria-hidden="true">
        <Skeleton className="h-20 w-full max-w-xs rounded-2xl" />
        <div className="flex w-full max-w-xl gap-4">
          <Skeleton className="h-20 flex-1 rounded-2xl" />
          <Skeleton className="h-20 flex-1 rounded-2xl" />
        </div>
        <Skeleton className="h-20 w-full max-w-xs rounded-2xl" />
        <Skeleton className="h-20 w-full max-w-xs rounded-2xl" />
      </div>
    </section>
  )
}

function StatusPanel({
  icon,
  title,
  message,
  tone = 'neutral',
  children,
}: {
  icon: React.ReactNode
  title: string
  message: string
  tone?: 'neutral' | 'error'
  children: React.ReactNode
}) {
  return (
    <section
      role={tone === 'error' ? 'alert' : undefined}
      className="mx-auto flex max-w-md flex-col items-center py-10 text-center"
    >
      <span
        className={
          tone === 'error'
            ? 'flex size-14 items-center justify-center rounded-2xl bg-destructive/10 text-destructive'
            : 'flex size-14 items-center justify-center rounded-2xl bg-accent text-accent-foreground'
        }
      >
        {icon}
      </span>
      <h1 className="mt-6 font-serif text-3xl font-medium text-balance">{title}</h1>
      <p className="mt-3 text-pretty leading-relaxed text-muted-foreground">{message}</p>
      <div className="mt-8 flex flex-col items-center gap-2 sm:flex-row">{children}</div>
    </section>
  )
}
