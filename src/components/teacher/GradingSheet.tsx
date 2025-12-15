'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Volume2, Send, Check } from 'lucide-react'
import Image from 'next/image'
import { generateDraft } from '@/actions/generate-draft'
import { finalizeGrade } from '@/actions/finalize-grade'
import { approveFeedback, sendFeedback } from '@/actions/feedback'

interface GradingSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  submissionId: string
  onSuccess?: () => void
}

async function fetchSubmission(id: string) {
  const res = await fetch(`/api/submissions/${id}`)
  if (!res.ok) {
    throw new Error('Failed to fetch submission')
  }
  return res.json()
}

export function GradingSheet({
  open,
  onOpenChange,
  submissionId,
  onSuccess,
}: GradingSheetProps) {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState<number | ''>('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => fetchSubmission(submissionId),
    enabled: open && !!submissionId,
    refetchInterval: (query) => {
      // Poll every 3 seconds if AI is still processing or audio is being generated
      const data = query.state.data
      if (data?.processingStatus === 'processing_ai' || data?.processingStatus === 'generating_audio') {
        return 3000
      }
      return false
    },
  })

  // Update local state when data loads
  useEffect(() => {
    if (data?.aiFeedback) {
      setFeedback(data.aiFeedback)
    }
    if (data?.finalScore !== null) {
      setScore(data.finalScore)
    }
  }, [data])

  // Auto-generate draft if no feedback exists and status is ready/pending
  const generateDraftMutation = useMutation({
    mutationFn: (regenerate: boolean = false) => generateDraft(submissionId, data?.imageUrls || [], regenerate),
    onSuccess: (result) => {
      if (result.success && result.feedback) {
        setFeedback(result.feedback)
        // Set AI-generated score if available
        if (result.score !== null && result.score !== undefined) {
          setScore(result.score)
        }
        queryClient.invalidateQueries({ queryKey: ['submission', submissionId] })
        queryClient.invalidateQueries({ queryKey: ['submissions'] })
      }
    },
  })

  useEffect(() => {
    if (
      data &&
      !data.aiFeedback &&
      data.processingStatus === 'ready' &&
      !generateDraftMutation.isPending
    ) {
      // If status is ready but no feedback, try to generate
      generateDraftMutation.mutate(false)
    }
  }, [data])

  const finalizeMutation = useMutation({
    mutationFn: () =>
      finalizeGrade(submissionId, feedback, typeof score === 'number' ? score : 0),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['submission', submissionId] })
        queryClient.invalidateQueries({ queryKey: ['submissions'] })
        onSuccess?.()
        onOpenChange(false)
      } else {
        alert('Failed to finalize grade. Please try again.')
      }
    },
  })

  const approveMutation = useMutation({
    mutationFn: () => approveFeedback(submissionId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['submission', submissionId] })
        queryClient.invalidateQueries({ queryKey: ['submissions'] })
      } else {
        alert(result.error || 'Failed to approve feedback')
      }
    },
  })

  const sendMutation = useMutation({
    mutationFn: () => sendFeedback(submissionId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['submission', submissionId] })
        queryClient.invalidateQueries({ queryKey: ['submissions'] })
        alert('Feedback sent successfully!')
      } else {
        alert(result.error || 'Failed to send feedback')
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

  const handleClose = () => {
    if (!finalizeMutation.isPending) {
      onOpenChange(false)
    }
  }

  if (!open) return null

  return (
    <Sheet open={open} onOpenChange={handleClose} side="left">
      <SheetContent onClose={handleClose} className="w-full max-w-6xl p-0">
        <SheetHeader className="border-b px-6 py-4">
          <SheetClose onClose={handleClose} />
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>
                {isLoading ? 'Loading...' : data ? `${data.studentName} • ${data.studentEmail}` : 'Grading'}
              </SheetTitle>
              <SheetDescription>
                Review and grade this submission
              </SheetDescription>
            </div>
            <div className="flex items-center gap-4">
              {data && (
                <>
                  <Badge
                    variant={
                      data.processingStatus === 'ready' || data.status === 'graded'
                        ? 'default'
                        : 'secondary'
                    }
                  >
                    {data.processingStatus === 'processing_ai' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Processing AI...
                      </span>
                    ) : data.processingStatus === 'ready' ? (
                      'Ready to Grade'
                    ) : data.status === 'graded' ? (
                      'Graded'
                    ) : (
                      'Pending'
                    )}
                  </Badge>
                  {data.finalScore !== null && (
                    <div className="text-lg font-semibold">
                      Score: {data.finalScore}/100
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="flex h-[calc(100vh-80px)] overflow-hidden p-0">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-500" />
            </div>
          ) : error || !data ? (
            <div className="flex h-full items-center justify-center">
              <Card className="w-full max-w-md">
                <CardContent className="pt-6 text-center">
                  <p className="text-red-500">Failed to load submission</p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <div className="flex h-full">
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
                    {data.processingStatus === 'processing_ai' && (
                      <div className="flex items-center gap-2 text-sm text-zinc-600">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        AI is generating feedback... This will auto-update when ready.
                      </div>
                    )}
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
                        disabled={data.status === 'graded'}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-medium">Feedback</label>
                      <Textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        placeholder={
                          data.processingStatus === 'processing_ai'
                            ? 'AI is generating feedback...'
                            : 'Enter feedback...'
                        }
                        className="min-h-[400px] font-mono text-sm"
                        disabled={data.processingStatus === 'processing_ai' && !feedback}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button
                        onClick={handleFinalize}
                        disabled={
                          finalizeMutation.isPending ||
                          data.status === 'graded' ||
                          data.processingStatus === 'processing_ai'
                        }
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
                      <div className="space-y-4">
                        {/* Prominent Audio Section */}
                        {data.processingStatus === 'generating_audio' && (
                          <div className="rounded-lg bg-blue-50 border-2 border-blue-300 p-4 dark:bg-blue-900/30 dark:border-blue-700">
                            <div className="flex items-center gap-3">
                              <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                              <div>
                                <p className="font-semibold text-blue-900 dark:text-blue-100">
                                  Generating Audio Feedback
                                </p>
                                <p className="text-xs text-blue-700 dark:text-blue-300">
                                  This will appear here when ready
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                        {data.audioUrl && (
                          <div className="rounded-lg bg-gradient-to-r from-blue-50 to-purple-50 border-2 border-blue-400 p-4 dark:from-blue-900/30 dark:to-purple-900/30 dark:border-blue-600">
                            <div className="flex items-center gap-3 mb-3">
                              <Volume2 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                              <p className="font-semibold text-blue-900 dark:text-blue-100">
                                Audio Feedback
                              </p>
                            </div>
                            <audio 
                              controls 
                              src={data.audioUrl} 
                              className="w-full h-12"
                              preload="metadata"
                            />
                          </div>
                        )}

                        {/* Approval and Send Actions */}
                        <div className="flex gap-2">
                          {!data.feedbackApproved && (
                            <Button
                              onClick={() => approveMutation.mutate()}
                              disabled={approveMutation.isPending}
                              variant="outline"
                              className="flex-1"
                              size="sm"
                            >
                              {approveMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Approving...
                                </>
                              ) : (
                                <>
                                  <Check className="mr-2 h-4 w-4" />
                                  Approve
                                </>
                              )}
                            </Button>
                          )}
                          {data.feedbackApproved && !data.feedbackSent && (
                            <Button
                              onClick={() => sendMutation.mutate()}
                              disabled={sendMutation.isPending}
                              className="flex-1 bg-blue-600 hover:bg-blue-700"
                              size="sm"
                            >
                              {sendMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Sending...
                                </>
                              ) : (
                                <>
                                  <Send className="mr-2 h-4 w-4" />
                                  Send Feedback
                                </>
                              )}
                            </Button>
                          )}
                          {data.feedbackSent && (
                            <div className="flex-1 rounded-lg bg-green-50 border border-green-200 p-2 dark:bg-green-900/20 dark:border-green-800">
                              <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                                <span className="text-xs font-medium text-green-900 dark:text-green-100">
                                  Sent to {data.studentEmail}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className="rounded-lg bg-green-50 border border-green-200 p-3 dark:bg-green-900/20 dark:border-green-800">
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4" />
                            <span className="text-sm font-medium">Grade finalized • Score: {data.finalScore}/100</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

