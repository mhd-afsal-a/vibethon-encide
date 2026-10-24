'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Clock } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { Step } from '@/lib/waypoint/types'

type StepFlowchartProps = {
  steps: Step[]
  selectedId?: string
  onSelect: (step: Step) => void
}

type Edge = { id: string; d: string }

function groupStepsByLevel(steps: Step[]) {
  const byId = new Map(steps.map((step) => [step.id, step]))
  const levels = new Map<string, number>()

  function levelOf(step: Step, visiting = new Set<string>()): number {
    const cached = levels.get(step.id)
    if (cached !== undefined) return cached
    if (visiting.has(step.id)) return 0
    visiting.add(step.id)
    const parents = step.depends_on.map((id) => byId.get(id)).filter(Boolean) as Step[]
    const level = parents.length
      ? Math.max(...parents.map((parent) => levelOf(parent, visiting))) + 1
      : 0
    levels.set(step.id, level)
    return level
  }

  const rows: Step[][] = []
  for (const step of [...steps].sort((a, b) => a.order - b.order)) {
    const level = levelOf(step)
    ;(rows[level] ??= []).push(step)
  }
  return rows.filter(Boolean)
}

export function StepFlowchart({ steps, selectedId, onSelect }: StepFlowchartProps) {
  const rows = useMemo(() => groupStepsByLevel(steps), [steps])
  const orderById = useMemo(() => new Map(steps.map((s) => [s.id, s.order])), [steps])
  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef(new Map<string, HTMLButtonElement>())
  const [edges, setEdges] = useState<Edge[]>([])

  useLayoutEffect(() => {
    const container = containerRef.current
    if (!container) return

    function measure() {
      if (!container) return
      const origin = container.getBoundingClientRect()
      const next: Edge[] = []
      for (const step of steps) {
        const child = nodeRefs.current.get(step.id)
        if (!child) continue
        const c = child.getBoundingClientRect()
        for (const parentId of step.depends_on) {
          const parent = nodeRefs.current.get(parentId)
          if (!parent) continue
          const p = parent.getBoundingClientRect()
          const x1 = p.left + p.width / 2 - origin.left
          const y1 = p.bottom - origin.top
          const x2 = c.left + c.width / 2 - origin.left
          const y2 = c.top - origin.top - 6
          const midY = (y1 + y2) / 2
          next.push({
            id: `${parentId}->${step.id}`,
            d: `M ${x1} ${y1} C ${x1} ${midY}, ${x2} ${midY}, ${x2} ${y2}`,
          })
        }
      }
      setEdges(next)
    }

    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(container)
    return () => observer.disconnect()
  }, [steps, rows])

  return (
    <div ref={containerRef} className="relative">
      <svg
        className="pointer-events-none absolute inset-0 size-full overflow-visible text-primary/45"
        aria-hidden="true"
      >
        <defs>
          <marker
            id="waypoint-arrow"
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="7"
            markerHeight="7"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="currentColor" />
          </marker>
        </defs>
        {edges.map((edge) => (
          <path
            key={edge.id}
            d={edge.d}
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            markerEnd="url(#waypoint-arrow)"
          />
        ))}
      </svg>

      <ol className="relative flex flex-col gap-14" aria-label="Steps">
        {rows.map((row, rowIndex) => (
          <li key={rowIndex}>
            <ul className="flex justify-center gap-3 sm:gap-5">
              {row.map((step) => {
                const isSelected = step.id === selectedId
                const dependsOn = step.depends_on
                  .map((id) => orderById.get(id))
                  .filter((n): n is number => n !== undefined)
                return (
                  <li key={step.id} className="w-full max-w-xs min-w-0 flex-1">
                    <button
                      type="button"
                      ref={(node) => {
                        if (node) nodeRefs.current.set(step.id, node)
                        else nodeRefs.current.delete(step.id)
                      }}
                      onClick={() => onSelect(step)}
                      aria-haspopup="dialog"
                      className={cn(
                        'flex w-full items-start gap-3 rounded-2xl border bg-card p-4 text-left shadow-xs transition-all outline-none hover:border-primary/40 hover:shadow-md focus-visible:ring-3 focus-visible:ring-ring/50 sm:p-5',
                        isSelected ? 'border-primary ring-3 ring-primary/15' : 'border-border',
                      )}
                    >
                      <span
                        className={cn(
                          'flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                          isSelected
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-accent text-accent-foreground',
                        )}
                      >
                        <span className="sr-only">Step </span>
                        {step.order}
                      </span>
                      <span className="flex min-w-0 flex-col gap-1.5">
                        <span className="text-sm leading-snug font-medium text-pretty sm:text-base">
                          {step.title}
                        </span>
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                          <span className="truncate">{step.time}</span>
                        </span>
                        {dependsOn.length > 0 && (
                          <span className="sr-only">
                            After step{dependsOn.length > 1 ? 's' : ''} {dependsOn.join(' and ')}
                          </span>
                        )}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ol>
    </div>
  )
}
