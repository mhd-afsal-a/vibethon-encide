export type EventId = 'death' | 'lost_documents'

export type Step = {
  order: number
  id: string
  title: string
  explanation: string
  why_now: string
  documents: string[]
  where: string
  time: string
  fee: string
  depends_on: string[]
  source_url: string
  last_verified: string
}

export type Plan = {
  tier: 'verified' | 'unsupported'
  event: EventId
  steps: Step[]
}

export type QuestionOption = {
  value: string
  label: string
}

export type Question = {
  key: string
  label: string
  type: 'single' | 'multi'
  options: QuestionOption[]
}

export type Answers = Record<string, string | string[]>

export type LifeEvent = {
  id: EventId
  title: string
  description: string
}
