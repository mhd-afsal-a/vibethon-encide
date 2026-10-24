import type { LifeEvent } from './types'

export const LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'death',
    title: 'Death of a family member',
    description:
      'What to do first, which papers you will need, and who to tell — one step at a time.',
  },
  {
    id: 'lost_documents',
    title: 'Lost wallet or documents',
    description:
      'Protect your accounts, report the loss, and replace your ID and cards in the right order.',
  },
]

export function getLifeEvent(id: string) {
  return LIFE_EVENTS.find((event) => event.id === id)
}
