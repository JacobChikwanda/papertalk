'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { validateMagicLink } from '@/actions/magic-links'
import { ImageCapture } from '@/components/student/ImageCapture'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export default function SubmitPage() {
  const params = useParams()
  const router = useRouter()
  const token = params.token as string
  const [isValidating, setIsValidating] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testInfo, setTestInfo] = useState<any>(null)

  useEffect(() => {
    async function checkMagicLink() {
      try {
        const result = await validateMagicLink(token)
        if (result.valid && result.magicLink) {
          setIsValid(true)
          setTestInfo(result.magicLink.test)
        } else {
          setError(result.error || 'Invalid magic link')
        }
      } catch (err) {
        setError('Failed to validate magic link')
      } finally {
        setIsValidating(false)
      }
    }

    if (token) {
      checkMagicLink()
    }
  }, [token])

  if (isValidating) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin text-zinc-500" />
          <p className="mt-4 text-zinc-600 dark:text-zinc-400">
            Validating magic link...
          </p>
        </div>
      </div>
    )
  }

  if (!isValid || error) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invalid Link</CardTitle>
            <CardDescription>
              {error || 'This magic link is no longer valid'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              This link may have already been used or has expired. Please contact
              your teacher for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto max-w-4xl px-4 py-8">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Submit Exam: {testInfo?.name}</CardTitle>
          <CardDescription>
            {testInfo?.course?.name}
          </CardDescription>
        </CardHeader>
      </Card>

      <ImageCapture magicLinkToken={token} testId={testInfo?.id} />
    </div>
  )
}

