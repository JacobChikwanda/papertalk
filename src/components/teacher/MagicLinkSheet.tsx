'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { createMagicLink } from '@/actions/magic-links'
import { Copy, Check, Link2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

interface MagicLinkSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  testId: string
  testName: string
  onSuccess?: () => void
}

export function MagicLinkSheet({
  open,
  onOpenChange,
  testId,
  testName,
  onSuccess,
}: MagicLinkSheetProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [magicLink, setMagicLink] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const result = await createMagicLink(testId)
      if (result.success && result.magicLink) {
        const fullUrl = `${window.location.origin}/submit/${result.magicLink.token}`
        setMagicLink(fullUrl)
        router.refresh()
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to generate magic link')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to generate magic link')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    if (magicLink) {
      await navigator.clipboard.writeText(magicLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setMagicLink(null)
      setError(null)
      setCopied(false)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose} side="left">
      <SheetContent onClose={handleClose} className="p-0">
        <SheetHeader>
          <SheetClose onClose={handleClose} />
          <SheetTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Generate Magic Link
          </SheetTitle>
          <SheetDescription>
            Create a one-time use link for students to submit their exam for {testName}
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <div className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            {magicLink ? (
              <div className="space-y-4">
                <div className="rounded-lg border bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="mb-2 text-sm font-medium">Magic Link:</p>
                  <p className="break-all font-mono text-sm">{magicLink}</p>
                </div>
                <div className="flex gap-3">
                  <Button onClick={handleCopy} className="flex-1" variant="outline">
                    {copied ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </>
                    )}
                  </Button>
                  <Button onClick={() => setMagicLink(null)} variant="ghost" className="flex-1">
                    Generate Another
                  </Button>
                </div>
                <div className="rounded-lg bg-blue-50 p-3 text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-400">
                  <p className="font-medium">Important:</p>
                  <p className="mt-1">
                    This link can only be used once. Once a student submits their exam, the link becomes invalid.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="rounded-lg border bg-zinc-50 p-4 dark:bg-zinc-900">
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Generate a secure, one-time use link that students can use to submit their exam. The link will
                    become invalid after first use.
                  </p>
                </div>
                <Button onClick={handleGenerate} disabled={isLoading} className="w-full" size="lg">
                  {isLoading ? 'Generating...' : 'Generate Magic Link'}
                </Button>
              </div>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

