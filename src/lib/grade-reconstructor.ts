// Reconstruct feedback text from structured grading data

import type { ParsedGrade, SectionGrade, QuestionGrade } from './grade-parser'

/**
 * Rebuild feedback text from structured grade data with updated marks
 */
export function reconstructFeedback(
  parsedGrade: ParsedGrade,
  updatedMarks?: Map<string, number> // Map of question IDs to new marks
): string {
  let feedback = ''

  // Rebuild sections
  for (const section of parsedGrade.sections) {
    feedback += `${section.sectionName}\n\n`

    for (const question of section.questions) {
      const questionId = `${section.sectionName}-Q${question.questionNumber}`
      const awardedMarks = updatedMarks?.get(questionId) ?? question.awardedMarks

      feedback += `Question ${question.questionNumber}: ${question.questionText}\n`
      
      if (question.feedback && question.feedback !== question.questionText) {
        feedback += `${question.feedback}\n`
      }

      feedback += `Marks Awarded: ${awardedMarks}/${question.maxMarks}\n\n`
    }

    // Calculate and add section total
    const sectionTotal = section.questions.reduce((sum, q) => {
      const questionId = `${section.sectionName}-Q${q.questionNumber}`
      return sum + (updatedMarks?.get(questionId) ?? q.awardedMarks)
    }, 0)
    const sectionMax = section.questions.reduce((sum, q) => sum + q.maxMarks, 0)

    feedback += `Total for ${section.sectionName}: ${sectionTotal}/${sectionMax} marks\n\n`
  }

  // Add overall feedback if present
  if (parsedGrade.overallFeedback) {
    feedback += `Overall Performance Assessment:\n${parsedGrade.overallFeedback}\n\n`
  }

  // Calculate new total score
  let newTotalScore = parsedGrade.totalScore
  if (updatedMarks && updatedMarks.size > 0) {
    // Recalculate total from all sections
    newTotalScore = parsedGrade.sections.reduce((total, section) => {
      return total + section.questions.reduce((sum, q) => {
        const questionId = `${section.sectionName}-Q${q.questionNumber}`
        return sum + (updatedMarks.get(questionId) ?? q.awardedMarks)
      }, 0)
    }, 0)
  }

  // Add score at the end
  feedback += `SCORE: ${newTotalScore}`

  return feedback
}

/**
 * Update marks in the original feedback text without full reconstruction
 * This is faster but less flexible - use when only marks need updating
 */
export function updateMarksInFeedback(
  originalFeedback: string,
  questionUpdates: Map<string, { old: number; new: number; max: number }>
): string {
  let updatedFeedback = originalFeedback

  // Update individual question marks
  for (const [questionId, update] of questionUpdates.entries()) {
    // Try various patterns to find and replace marks
    const patterns = [
      new RegExp(`(Question\\s+\\d+[^\\n]*?)\\s*${update.old}\\s*\\/\\s*${update.max}`, 'gi'),
      new RegExp(`(Marks\\s+Awarded[:.]?\\s*)${update.old}\\s*\\/\\s*${update.max}`, 'gi'),
      new RegExp(`(\\d+\\s*\\/\\s*)${update.max}(?=\\s*marks?)`, 'gi'),
    ]

    for (const pattern of patterns) {
      if (pattern.test(updatedFeedback)) {
        updatedFeedback = updatedFeedback.replace(
          new RegExp(`(${update.old})\\s*\\/\\s*${update.max}`, 'g'),
          `${update.new}/${update.max}`
        )
        break
      }
    }
  }

  // Update final score
  const scoreMatch = originalFeedback.match(/SCORE:\s*(\d+)/i)
  if (scoreMatch) {
    // Calculate new total
    const oldTotal = parseInt(scoreMatch[1], 10)
    const markDiff = Array.from(questionUpdates.values()).reduce(
      (sum, update) => sum + (update.new - update.old),
      0
    )
    const newTotal = Math.max(0, Math.min(100, oldTotal + markDiff))

    updatedFeedback = updatedFeedback.replace(/SCORE:\s*\d+/i, `SCORE: ${newTotal}`)
  }

  return updatedFeedback
}

