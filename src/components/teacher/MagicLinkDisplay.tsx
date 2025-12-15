'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createMagicLink } from '@/actions/magic-links'
import { Copy, Check } from 'lucide-react'

interface MagicLinkDisplayProps {
  testId: string
  testName: string
}

export function MagicLinkDisplay({ testId, testName }: MagicLinkDisplayProps) {
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Magic Link for: {testName}</CardTitle>
        <CardDescription>
          Generate a one-time use link. Once a student uses it to submit, the link becomes invalid.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
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
            <Button onClick={handleCopy} className="w-full" variant="outline">
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
            <Button onClick={() => setMagicLink(null)} variant="ghost" className="w-full">
              Generate Another
            </Button>
          </div>
        ) : (
          <Button onClick={handleGenerate} disabled={isLoading} className="w-full">
            {isLoading ? 'Generating...' : 'Generate Magic Link'}
          </Button>
        )}
      </CardContent>
    </Card>
  )
}

