'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Volume2 } from 'lucide-react'
import Image from 'next/image'
import { generateDraft } from '@/actions/generate-draft'
import { finalizeGrade } from '@/actions/finalize-grade'

async function fetchSubmission(id: string) {
  const res = await fetch(`/api/submissions/${id}`)
  if (!res.ok) {
    throw new Error('Failed to fetch submission')
  }
  return res.json()
}

export default function GradePage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const id = params.id as string

  const { data, isLoading, error } = useQuery({
    queryKey: ['submission', id],
    queryFn: () => fetchSubmission(id),
  })

  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState<number | ''>('')

  // Update local state when data loads
  useEffect(() => {
    if (data?.aiFeedback) {
      setFeedback(data.aiFeedback)
    }
    if (data?.finalScore !== null) {
      setScore(data.finalScore)
    }
  }, [data])

  // Auto-generate draft if no feedback exists
  const generateDraftMutation = useMutation({
    mutationFn: () => generateDraft(id, data?.imageUrls || []),
    onSuccess: (result) => {
      if (result.success && result.feedback) {
        setFeedback(result.feedback)
        queryClient.invalidateQueries({ queryKey: ['submission', id] })
      }
    },
  })

  useEffect(() => {
    if (data && !data.aiFeedback && !generateDraftMutation.isPending) {
      generateDraftMutation.mutate()
    }
  }, [data])

  const finalizeMutation = useMutation({
    mutationFn: () =>
      finalizeGrade(id, feedback, typeof score === 'number' ? score : 0),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['submission', id] })
        queryClient.invalidateQueries({ queryKey: ['submissions'] })
        alert('Grade finalized successfully!')
      } else {
        alert('Failed to finalize grade. Please try again.')
      }
    },
  })

  const handleFinalize = () => {
    if (!feedback.trim()) {
      alert('Please provide feedback before finalizing')
      return
    }
    if (score === '' || (typeof score === 'number' && (score < 0 || score > 100))) {
      alert('Please enter a valid score (0-100)')
      return
    }
    finalizeMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="text-red-500">Failed to load submission</p>
            <Button
              variant="outline"
              className="mt-4"
              onClick={() => router.push('/teacher')}
            >
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col bg-zinc-50 dark:bg-zinc-900">
      {/* Header */}
      <div className="border-b bg-white px-6 py-4 dark:bg-zinc-800">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Grading Room</h1>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {data.studentName} • {data.studentEmail}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Badge
              variant={data.status === 'graded' ? 'default' : 'secondary'}
            >
              {data.status}
            </Badge>
            {data.finalScore !== null && (
              <div className="text-lg font-semibold">
                Score: {data.finalScore}/100
              </div>
            )}
            {data.audioUrl && (
              <audio controls src={data.audioUrl} className="h-8" />
            )}
            <Button variant="outline" onClick={() => {
              if (data.test?.id) {
                router.push(`/teacher/tests/${data.test.id}`)
              } else {
                router.push('/teacher')
              }
            }}>
              Back to Test
            </Button>
          </div>
        </div>
      </div>

      {/* Split Screen Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Image Gallery */}
        <div className="w-1/2 overflow-y-auto border-r bg-white p-6 dark:bg-zinc-800">
          <h2 className="mb-4 text-lg font-semibold">Exam Images</h2>
          <div className="space-y-4">
            {data.imageUrls.map((url: string, index: number) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="relative aspect-[3/4] w-full">
                    <Image
                      src={url}
                      alt={`Exam page ${index + 1}`}
                      fill
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Right: Feedback Editor */}
        <div className="flex w-1/2 flex-col overflow-y-auto bg-zinc-50 p-6 dark:bg-zinc-900">
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Feedback Editor</CardTitle>
              {generateDraftMutation.isPending && (
                <div className="flex items-center gap-2 text-sm text-zinc-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generating AI feedback...
                </div>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Final Score (0-100)</label>
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={score}
                  onChange={(e) =>
                    setScore(e.target.value === '' ? '' : parseInt(e.target.value))
                  }
                  placeholder="Enter score"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Feedback</label>
                <Textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback..."
                  className="min-h-[400px] font-mono text-sm"
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleFinalize}
                  disabled={finalizeMutation.isPending || data.status === 'graded'}
                  className="flex-1"
                >
                  {finalizeMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Finalizing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Finalize Grade
                    </>
                  )}
                </Button>
              </div>

              {data.status === 'graded' && (
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4" />
                    <span>Grade finalized</span>
                  </div>
                  {data.audioUrl && (
                    <div className="mt-2 flex items-center gap-2">
                      <Volume2 className="h-4 w-4" />
                      <span>Audio feedback available</span>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

