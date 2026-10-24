'use client'

import { useEffect, useRef, useState } from 'react'
import { Banknote, CalendarCheck, Clock, ExternalLink, FileText, MapPin } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import type { Step } from '@/lib/waypoint/types'

const dateFormatter = new Intl.DateTimeFormat('en-US', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  timeZone: 'UTC',
})

type StepDetailSheetProps = {
  step: Step | null
  allSteps: Step[]
  onOpenChange: (open: boolean) => void
}

export function StepDetailSheet({ step, allSteps, onOpenChange }: StepDetailSheetProps) {
  // Keep the last step rendered while the sheet animates closed.
  const titleRef = useRef<HTMLHeadingElement>(null)
  const [displayed, setDisplayed] = useState<Step | null>(step)
  useEffect(() => {
    if (step) setDisplayed(step)
  }, [step])

  const current = step ?? displayed
  const prerequisites = current
    ? allSteps.filter((s) => current.depends_on.includes(s.id))
    : []

  return (
    <Sheet open={step !== null} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        initialFocus={titleRef}
        className="w-full gap-0 overflow-y-auto sm:max-w-md"
      >
        {current && (
          <>
            <SheetHeader className="gap-3 border-b border-border p-6 pr-12">
              <span className="text-xs font-medium tracking-wide text-primary uppercase">
                Step {current.order} of {allSteps.length}
              </span>
              <SheetTitle
                ref={titleRef}
                tabIndex={-1}
                className="font-serif text-2xl leading-snug font-medium text-balance outline-none"
              >
                {current.title}
              </SheetTitle>
              <SheetDescription className="text-pretty text-sm leading-relaxed text-muted-foreground">
                {current.explanation}
              </SheetDescription>
            </SheetHeader>

            <div className="flex flex-col gap-7 p-6">
              <section className="rounded-xl bg-accent p-4">
                <h3 className="text-sm font-medium text-accent-foreground">Why now</h3>
                <p className="mt-1 text-pretty text-sm leading-relaxed text-foreground/80">
                  {current.why_now}
                </p>
                {prerequisites.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Comes after: {prerequisites.map((p) => `${p.order}. ${p.title}`).join(', ')}
                  </p>
                )}
              </section>

              <section>
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <FileText className="size-4 text-primary" aria-hidden="true" />
                  Documents to bring
                </h3>
                <ul className="mt-3 flex flex-col gap-2">
                  {current.documents.map((doc) => (
                    <li key={doc} className="flex gap-2.5 text-sm leading-relaxed text-foreground/85">
                      <span
                        className="mt-2 size-1.5 shrink-0 rounded-full bg-primary/50"
                        aria-hidden="true"
                      />
                      {doc}
                    </li>
                  ))}
                </ul>
              </section>

              <dl className="flex flex-col divide-y divide-border rounded-xl border border-border">
                <DetailRow icon={MapPin} label="Where" value={current.where} />
                <DetailRow icon={Clock} label="Time" value={current.time} />
                <DetailRow icon={Banknote} label="Fee" value={current.fee} />
              </dl>

              <div className="flex flex-col gap-3 border-t border-border pt-5">
                <a
                  href={current.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  View official source
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarCheck className="size-3.5" aria-hidden="true" />
                  Last verified{' '}
                  <time dateTime={current.last_verified}>
                    {dateFormatter.format(new Date(current.last_verified))}
                  </time>
                </p>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin
  label: string
  value: string
}) {
  return (
    <div className="flex gap-3 p-4">
      <Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
        <dd className="mt-0.5 text-pretty text-sm leading-relaxed">{value}</dd>
      </div>
    </div>
  )
}
