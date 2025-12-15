'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MagicLinkButton } from './MagicLinkButton'
import { TestPaperButton } from './TestPaperButton'
import { TeacherSubmissionButton } from './TeacherSubmissionButton'
import { ArrowLeft } from 'lucide-react'

interface TestDetailHeaderProps {
  testName: string
  courseName: string
  courseId: string
  testId: string
  testPaper?: {
    fileName: string
    fileUrl: string
  } | null
}

export function TestDetailHeader({
  testName,
  courseName,
  courseId,
  testId,
  testPaper,
}: TestDetailHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 border-b pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1 min-w-0">
        <Link
          href={`/teacher/courses/${courseId}`}
          className="mb-2 inline-flex items-center text-sm text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back to Course
        </Link>
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight truncate">{testName}</h1>
          <p className="mt-1 text-sm text-zinc-500 truncate">Course: {courseName}</p>
        </div>
      </div>
      <div className="flex flex-shrink-0 items-center gap-3 sm:flex-row">
        {testPaper && (
          <TestPaperButton fileName={testPaper.fileName} fileUrl={testPaper.fileUrl} />
        )}
        <TeacherSubmissionButton testId={testId} testName={testName} />
        <MagicLinkButton testId={testId} testName={testName} />
      </div>
    </div>
  )
}

