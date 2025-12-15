// Parser to extract structured grading data from AI feedback

export interface QuestionGrade {
  questionNumber: string
  questionText: string
  maxMarks: number
  awardedMarks: number
  feedback: string
}

export interface SectionGrade {
  sectionName: string
  questions: QuestionGrade[]
  totalMarks: number
  maxSectionMarks: number
}

export interface ParsedGrade {
  sections: SectionGrade[]
  totalScore: number
  rawFeedback: string
  overallFeedback?: string
}

/**
 * Parse AI-generated feedback into structured grading data
 */
export function parseGradeFeedback(feedback: string): ParsedGrade {
  const sections: SectionGrade[] = []
  let totalScore = 0
  let overallFeedback = ''

  // Extract score from the end (format: "SCORE: 14" or "SCORE: 14/100")
  const scoreMatch = feedback.match(/SCORE:\s*(\d+)(?:\s*\/\s*100)?\s*$/im)
  if (scoreMatch) {
    totalScore = parseInt(scoreMatch[1], 10)
  }

  // Remove score line from feedback for parsing
  const feedbackWithoutScore = feedback.replace(/SCORE:\s*\d+(?:\s*\/\s*100)?\s*$/im, '').trim()

  // Split by sections (Section A, Section B, etc.)
  const sectionRegex = /(?:^|\n)(Section\s+[A-Z]:[^\n]*)/gi
  const sectionMatches = [...feedbackWithoutScore.matchAll(sectionRegex)]

  if (sectionMatches.length === 0) {
    // No clear sections, try to parse as a single section or by questions
    return parseWithoutSections(feedbackWithoutScore, totalScore, feedback)
  }

  // Parse each section
  for (let i = 0; i < sectionMatches.length; i++) {
    const sectionStart = sectionMatches[i].index!
    const sectionEnd = i < sectionMatches.length - 1 ? sectionMatches[i + 1].index! : feedbackWithoutScore.length
    const sectionText = feedbackWithoutScore.substring(sectionStart, sectionEnd)

    const sectionName = sectionMatches[i][1].trim()
    const questions = parseQuestionsInSection(sectionText)
    
    // Calculate section totals
    const totalMarks = questions.reduce((sum, q) => sum + q.awardedMarks, 0)
    const maxSectionMarks = questions.reduce((sum, q) => sum + q.maxMarks, 0)

    sections.push({
      sectionName,
      questions,
      totalMarks,
      maxSectionMarks,
    })
  }

  // Extract overall feedback (usually at the end, before score)
  const overallMatch = feedbackWithoutScore.match(/(?:Overall\s+Performance\s+Assessment|Summary|Overall)[:.]?\s*([\s\S]*?)(?=\n\n|$)/i)
  if (overallMatch) {
    overallFeedback = overallMatch[1].trim()
  }

  return {
    sections,
    totalScore,
    rawFeedback: feedback,
    overallFeedback: overallFeedback || undefined,
  }
}

/**
 * Parse questions within a section
 */
function parseQuestionsInSection(sectionText: string): QuestionGrade[] {
  const questions: QuestionGrade[] = []

  // Match question patterns like:
  // "Question 1: ... Marks Awarded: 0/25"
  // "Question 1 (25 marks): 0 marks"
  // "• Question 1: ... 0/25"
  const questionRegex = /(?:Question|Q)\s*(\d+)[:.)]?\s*([^\n]*?)(?:\((\d+)\s*marks?\))?[\s\S]*?(?:Marks\s+Awarded|Awarded|Marks?)[:.]?\s*(\d+)\s*\/\s*(\d+)/gi

  let match
  while ((match = questionRegex.exec(sectionText)) !== null) {
    const questionNumber = match[1]
    const questionText = match[2].trim() || `Question ${questionNumber}`
    const maxMarks = match[5] ? parseInt(match[5], 10) : (match[3] ? parseInt(match[3], 10) : 0)
    const awardedMarks = parseInt(match[4], 10)

    // Extract feedback for this question (text between question and marks)
    const questionStart = match.index
    const questionEnd = match.index + match[0].length
    const questionContext = sectionText.substring(Math.max(0, questionStart - 200), questionEnd)
    
    // Try to extract more detailed feedback
    const feedbackMatch = questionContext.match(/(?:Student's\s+Attempt|Attempt|Feedback)[:.]?\s*([^\n]+(?:\n(?!Question|Marks)[^\n]+)*)/i)
    const feedback = feedbackMatch ? feedbackMatch[1].trim() : ''

    questions.push({
      questionNumber,
      questionText,
      maxMarks,
      awardedMarks,
      feedback: feedback || questionText,
    })
  }

  // If no questions found with standard pattern, try alternative patterns
  if (questions.length === 0) {
    // Try pattern: "Question X: ... 0/25 marks"
    const altRegex = /(?:Question|Q)\s*(\d+)[:.)]?\s*([^\n]*?)\s*(\d+)\s*\/\s*(\d+)\s*marks?/gi
    let altMatch
    while ((altMatch = altRegex.exec(sectionText)) !== null) {
      questions.push({
        questionNumber: altMatch[1],
        questionText: altMatch[2].trim() || `Question ${altMatch[1]}`,
        maxMarks: parseInt(altMatch[4], 10),
        awardedMarks: parseInt(altMatch[3], 10),
        feedback: altMatch[2].trim() || '',
      })
    }
  }

  return questions
}

/**
 * Parse feedback that doesn't have clear section markers
 */
function parseWithoutSections(feedbackText: string, totalScore: number, rawFeedback: string): ParsedGrade {
  const questions = parseQuestionsInSection(feedbackText)
  
  if (questions.length > 0) {
    return {
      sections: [
        {
          sectionName: 'All Questions',
          questions,
          totalMarks: questions.reduce((sum, q) => sum + q.awardedMarks, 0),
          maxSectionMarks: questions.reduce((sum, q) => sum + q.maxMarks, 0),
        },
      ],
      totalScore,
      rawFeedback,
    }
  }

  // If we can't parse anything, return empty structure
  return {
    sections: [],
    totalScore,
    rawFeedback,
  }
}

