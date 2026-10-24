import { SAMPLE_DEATH_PLAN } from './data'
import type { Answers, EventId, Plan } from './types'

const SIMULATED_LATENCY_MS = 1200

let simulatedFailuresRemaining: number | null = null

function shouldSimulateFailure() {
  if (simulatedFailuresRemaining === null) {
    const params = new URLSearchParams(window.location.search)
    simulatedFailuresRemaining = params.get('demo') === 'error' ? 1 : 0
  }
  if (simulatedFailuresRemaining > 0) {
    simulatedFailuresRemaining -= 1
    return true
  }
  return false
}

export async function fetchPlan([, event]: readonly [string, EventId, Answers]): Promise<Plan> {
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS))

  if (shouldSimulateFailure()) {
    throw new Error('We could not reach the guidance service.')
  }

  if (event === 'death') return SAMPLE_DEATH_PLAN

  return { tier: 'unsupported', event, steps: [] }
}
