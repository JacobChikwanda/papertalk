'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { FileText } from 'lucide-react'
import { TestPaperViewer } from './TestPaperViewer'

interface TestPaperButtonProps {
  fileName: string
  fileUrl: string
}

export function TestPaperButton({ fileName, fileUrl }: TestPaperButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline" className="whitespace-nowrap">
        <FileText className="mr-2 h-4 w-4" />
        View Test Paper
      </Button>
      <TestPaperViewer
        open={open}
        onOpenChange={setOpen}
        fileName={fileName}
        fileUrl={fileUrl}
      />
    </>
  )
}

