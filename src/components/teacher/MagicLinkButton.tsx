'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Link2 } from 'lucide-react'
import { MagicLinkSheet } from './MagicLinkSheet'

interface MagicLinkButtonProps {
  testId: string
  testName: string
}

export function MagicLinkButton({ testId, testName }: MagicLinkButtonProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <Button onClick={() => setOpen(true)} className="whitespace-nowrap">
        <Link2 className="mr-2 h-4 w-4" />
        Generate Magic Link
      </Button>
      <MagicLinkSheet
        open={open}
        onOpenChange={setOpen}
        testId={testId}
        testName={testName}
      />
    </>
  )
}

