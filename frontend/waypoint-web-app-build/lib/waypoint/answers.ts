import type { Answers, Question } from './types'

export function isAnswered(question: Question, answers: Answers) {
  const value = answers[question.key]
  return Array.isArray(value) ? value.length > 0 : Boolean(value)
}

export function isComplete(questions: Question[], answers: Answers) {
  return questions.every((question) => isAnswered(question, answers))
}
