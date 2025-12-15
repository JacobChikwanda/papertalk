'use client'

import { useState, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import type { ParsedGrade, SectionGrade, QuestionGrade } from '@/lib/grade-parser'

interface GradeTableProps {
  parsedGrade: ParsedGrade
  onMarksChange: (questionId: string, newMarks: number) => void
}

export function GradeTable({ parsedGrade, onMarksChange }: GradeTableProps) {
  const [localMarks, setLocalMarks] = useState<Map<string, number>>(new Map())

  // Initialize local marks from parsed grade
  useEffect(() => {
    const marks = new Map<string, number>()
    parsedGrade.sections.forEach((section) => {
      section.questions.forEach((question) => {
        const questionId = `${section.sectionName}-Q${question.questionNumber}`
        marks.set(questionId, question.awardedMarks)
      })
    })
    setLocalMarks(marks)
  }, [parsedGrade])

  const handleMarkChange = (questionId: string, value: string) => {
    const newMarks = parseInt(value, 10)
    if (!isNaN(newMarks) && newMarks >= 0) {
      const updatedMarks = new Map(localMarks)
      updatedMarks.set(questionId, newMarks)
      setLocalMarks(updatedMarks)
      onMarksChange(questionId, newMarks)
    }
  }

  const calculateSectionTotal = (section: SectionGrade): number => {
    return section.questions.reduce((sum, question) => {
      const questionId = `${section.sectionName}-Q${question.questionNumber}`
      return sum + (localMarks.get(questionId) ?? question.awardedMarks)
    }, 0)
  }

  const calculateOverallTotal = (): number => {
    return parsedGrade.sections.reduce((sum, section) => {
      return sum + calculateSectionTotal(section)
    }, 0)
  }

  if (parsedGrade.sections.length === 0) {
    return (
      <div className="text-center py-8 text-zinc-500 dark:text-zinc-400">
        No structured grading data available. Please edit the feedback manually.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {parsedGrade.sections.map((section, sectionIndex) => (
        <div key={sectionIndex} className="space-y-2">
          {/* Simple Section Header */}
          <div className="flex items-center justify-between p-2 bg-zinc-100 dark:bg-zinc-800 rounded">
            <span className="font-semibold">{section.sectionName}</span>
            <span className="text-sm">
              {calculateSectionTotal(section)}/{section.maxSectionMarks} marks
            </span>
          </div>

          {/* Simple Question List */}
          <div className="space-y-2 pl-4">
            {section.questions.map((question) => {
              const questionId = `${section.sectionName}-Q${question.questionNumber}`
              const currentMarks = localMarks.get(questionId) ?? question.awardedMarks

              return (
                <div key={questionId} className="flex items-center gap-3 p-2 border rounded">
                  <span className="font-medium w-20">Q{question.questionNumber}:</span>
                  <Input
                    type="number"
                    min="0"
                    max={question.maxMarks}
                    value={currentMarks}
                    onChange={(e) => handleMarkChange(questionId, e.target.value)}
                    className="w-20 text-center h-9"
                  />
                  <span className="text-sm text-zinc-600 dark:text-zinc-400">
                    / {question.maxMarks}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      ))}

      {/* Simple Total */}
      <div className="border-t pt-3 mt-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold">Total Score:</span>
          <span className="text-xl font-bold">
            {calculateOverallTotal()}/100
          </span>
        </div>
      </div>
    </div>
  )
}

