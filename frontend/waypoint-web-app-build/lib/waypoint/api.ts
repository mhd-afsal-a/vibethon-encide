import type { Answers, EventId, Plan, Question, QuestionOption, Step } from './types'

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001').replace(/\/+$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_URL}${path}`, init)
  } catch {
    throw new Error('We could not reach the guidance service. Check your connection and try again.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body && typeof body.error === 'string'
        ? body.error
        : 'Something went wrong on our side. Please try again.'
    throw new Error(message)
  }
  return body as T
}

const asString = (value: unknown) => (typeof value === 'string' ? value : '')
const asStringList = (value: unknown) =>
  Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []

// Keep only the fields the UI knows about; step numbers follow the response order.
function toStep(raw: Record<string, unknown>, index: number): Step {
  return {
    order: index + 1,
    id: asString(raw.id) || `step-${index + 1}`,
    title: asString(raw.title),
    explanation: asString(raw.explanation),
    why_now: asString(raw.why_now),
    documents: asStringList(raw.documents),
    where: asString(raw.where),
    time: asString(raw.time),
    fee: asString(raw.fee),
    depends_on: asStringList(raw.depends_on),
    source_url: asString(raw.source_url),
    last_verified: asString(raw.last_verified),
  }
}

function toOption(raw: Record<string, unknown>): QuestionOption {
  const value = asString(raw.value)
  return { value, label: asString(raw.label) || value }
}

function toQuestion(raw: Record<string, unknown>): Question {
  const key = asString(raw.key)
  return {
    key,
    label: asString(raw.label) || key,
    type: raw.type === 'multi' ? 'multi' : 'single',
    options: Array.isArray(raw.options) ? raw.options.map(toOption) : [],
  }
}

export async function fetchQuestions([, event]: readonly [string, EventId]): Promise<Question[]> {
  const body = await request<unknown>(`/questions/${encodeURIComponent(event)}`)
  return Array.isArray(body) ? body.map(toQuestion) : []
}

export type IntakeResult = {
  event: EventId | null
  answers: Answers
  aiAvailable: boolean
}

const KNOWN_EVENTS: readonly EventId[] = ['death', 'lost_documents']

export async function fetchIntake(prompt: string): Promise<IntakeResult> {
  const body = await request<Record<string, unknown>>('/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  })

  const aiAvailable = body?.ai_status !== 'fallback'
  const event = KNOWN_EVENTS.find((id) => id === body?.event) ?? null
  if (!event) return { event: null, answers: {}, aiAvailable }

  const answers: Answers = {}
  const raw = body.answers
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [key, value] of Object.entries(raw)) {
      if (typeof value === 'string') answers[key] = value
      else if (Array.isArray(value)) answers[key] = asStringList(value)
    }
  }
  return { event, answers, aiAvailable }
}

export async function fetchPlan([, event, answers]: readonly [string, EventId, Answers]): Promise<Plan> {
  const body = await request<Record<string, unknown>>('/roadmap', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ event, answers }),
  })

  if (body?.tier !== 'verified') return { tier: 'unsupported', event, steps: [] }

  const steps = Array.isArray(body.steps) ? body.steps : []
  return { tier: 'verified', event, steps: steps.map(toStep) }
}
