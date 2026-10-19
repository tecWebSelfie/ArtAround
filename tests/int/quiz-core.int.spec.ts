import { describe, expect, it } from 'vitest'
import {
  CORRECT_ANSWER,
  UNANSWERED,
  betterThanPercent,
  gradeQuiz,
  optionKey,
  questionView,
  resolveOption,
  scoreBand,
} from '@/lib/quiz-core'

const SECRET = 'test-secret'
const question = {
  id: 'q1',
  prompt: 'Which technique?',
  image: null,
  relatedTo: ['c1'],
  correctAnswer: 'Tempera',
  wrongAnswers: [
    { id: 'w1', text: 'Fresco' },
    { id: 'w2', text: 'Oil' },
    { id: 'w3', text: 'Watercolour' },
  ],
}

describe('quiz option keys', () => {
  it('sends four options with opaque keys and no answer data', () => {
    const view = questionView(SECRET, question)
    expect(view.options.map((o) => o.text).sort()).toEqual(
      ['Fresco', 'Oil', 'Tempera', 'Watercolour'].sort(),
    )
    expect(view.contentIds).toEqual(['c1'])
    const serialized = JSON.stringify(view)
    for (const secret of [CORRECT_ANSWER, 'w1', 'w2', 'w3', SECRET]) {
      expect(serialized).not.toContain(`"${secret}"`)
    }
    for (const option of view.options) expect(option.key).toMatch(/^[\w-]{16}$/)
  })

  it('resolves keys back to stored answers, and rejects foreign keys', () => {
    expect(resolveOption(SECRET, question, optionKey(SECRET, 'q1', CORRECT_ANSWER))).toEqual({
      question: 'q1',
      answer: CORRECT_ANSWER,
      correct: true,
    })
    expect(resolveOption(SECRET, question, optionKey(SECRET, 'q1', 'w2'))?.correct).toBe(false)
    // Same answer of another question, or keyed with another secret.
    expect(resolveOption(SECRET, question, optionKey(SECRET, 'q2', CORRECT_ANSWER))).toBeNull()
    expect(resolveOption(SECRET, question, optionKey('other', 'q1', CORRECT_ANSWER))).toBeNull()
  })

  it('keeps keys stable across shuffles so stored choices survive reloads', () => {
    const keys = (view: ReturnType<typeof questionView>) => view.options.map((o) => o.key).sort()
    expect(keys(questionView(SECRET, question))).toEqual(keys(questionView(SECRET, question)))
  })
})

describe('quiz grading', () => {
  it('grades from the stored questions and counts missing choices as wrong', () => {
    const second = { ...question, id: 'q2' }
    const result = gradeQuiz(SECRET, [question, second], {
      q1: optionKey(SECRET, 'q1', CORRECT_ANSWER),
      ignored: optionKey(SECRET, 'ignored', CORRECT_ANSWER),
    })
    expect(result).toEqual({
      score: 1,
      total: 2,
      answers: [
        { question: 'q1', answer: CORRECT_ANSWER, correct: true },
        { question: 'q2', answer: UNANSWERED, correct: false },
      ],
    })
  })
})

describe('quiz statistics helpers', () => {
  it('bands scores by percentage, inclusive of each upper bound', () => {
    expect(scoreBand(0, 5)).toBe(0)
    expect(scoreBand(1, 5)).toBe(0)
    expect(scoreBand(2, 5)).toBe(1)
    expect(scoreBand(3, 5)).toBe(2)
    expect(scoreBand(4, 5)).toBe(3)
    expect(scoreBand(5, 5)).toBe(4)
    expect(scoreBand(0, 0)).toBe(0)
  })

  it('compares with the other attempts only', () => {
    expect(betterThanPercent(6, 11)).toBe(60)
    expect(betterThanPercent(0, 1)).toBe(0)
  })
})
