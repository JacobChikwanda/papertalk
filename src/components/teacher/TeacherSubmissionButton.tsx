'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'
import { TeacherSubmissionSheet } from './TeacherSubmissionSheet'

interface TeacherSubmissionButtonProps {
  testId: string
  testName: string
}

export function TeacherSubmissionButton({ testId, testName }: TeacherSubmissionButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Upload className="mr-2 h-4 w-4" />
        Add Submission
      </Button>
      <TeacherSubmissionSheet
        testId={testId}
        testName={testName}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  )
}

