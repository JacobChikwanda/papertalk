'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogBody,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Loader2, CheckCircle2, Volume2, X, ChevronLeft, ChevronRight, RefreshCw, Calculator, Send, Check } from 'lucide-react'
import Image from 'next/image'
import { generateDraft } from '@/actions/generate-draft'
import { finalizeGrade } from '@/actions/finalize-grade'
import { retriggerAIGrading } from '@/actions/retrigger-ai-grading'
import { approveFeedback, sendFeedback } from '@/actions/feedback'
import { parseGradeFeedback } from '@/lib/grade-parser'
import { reconstructFeedback } from '@/lib/grade-reconstructor'
import { GradeTable } from './GradeTable'

interface GradingModalProps {
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

function stripMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+(.+)$/gm, '$1') // Headers
    .replace(/^---+$/gm, '') // Horizontal rules
    .replace(/\*\*(.+?)\*\*/g, '$1') // Bold
    .replace(/\*(.+?)\*/g, '$1') // Italic
    .replace(/^[-*+]\s+/gm, '• ') // List items to bullet
    .replace(/^\d+\.\s+/gm, '') // Numbered lists
    .replace(/`(.+?)`/g, '$1') // Inline code
    .replace(/```[\s\S]*?```/g, '') // Code blocks
    .trim()
}

export function GradingModal({
  open,
  onOpenChange,
  submissionId,
  onSuccess,
}: GradingModalProps) {
  const queryClient = useQueryClient()
  const [feedback, setFeedback] = useState('')
  const [score, setScore] = useState<number | ''>('')
  const [currentImageIndex, setCurrentImageIndex] = useState(0)
  const [parsedGrade, setParsedGrade] = useState<ReturnType<typeof parseGradeFeedback> | null>(null)
  const [markUpdates, setMarkUpdates] = useState<Map<string, number>>(new Map())
  const [showMarkAdjustment, setShowMarkAdjustment] = useState(false)

  const { data, isLoading, error } = useQuery({
    queryKey: ['submission', submissionId],
    queryFn: () => fetchSubmission(submissionId),
    enabled: open && !!submissionId,
    refetchInterval: (query) => {
      const data = query.state.data
      // Poll if AI is processing or audio is being generated
      if (data?.processingStatus === 'processing_ai' || data?.processingStatus === 'generating_audio') {
        return 3000
      }
      return false
    },
  })

  // Update local state when data loads
  useEffect(() => {
    if (data?.aiFeedback) {
      // Strip markdown formatting from AI feedback for cleaner display
      const strippedFeedback = stripMarkdown(data.aiFeedback)
      setFeedback(strippedFeedback)
      
      // Try to parse into structured format
      try {
        const parsed = parseGradeFeedback(strippedFeedback)
        if (parsed.sections.length > 0) {
          setParsedGrade(parsed)
          // Set score from parsed grade if available (including 0)
          if (parsed.totalScore !== null && parsed.totalScore !== undefined) {
            setScore(parsed.totalScore)
          } else if (data && data.finalScore !== null && data.finalScore !== undefined) {
            setScore(data.finalScore)
          } else {
            // Try to extract score from feedback text
            const scoreMatch = strippedFeedback.match(/SCORE:\s*(\d+)/i)
            if (scoreMatch) {
              setScore(parseInt(scoreMatch[1], 10))
            }
          }
        } else {
          setParsedGrade(null)
          // Set score from finalScore if no parsed grade
          if (data && data.finalScore !== null && data.finalScore !== undefined) {
            setScore(data.finalScore)
          } else {
            // Try to extract score from feedback text
            const scoreMatch = strippedFeedback.match(/SCORE:\s*(\d+)/i)
            if (scoreMatch) {
              setScore(parseInt(scoreMatch[1], 10))
            }
          }
        }
      } catch (error) {
        console.error('Error parsing grade feedback:', error)
        setParsedGrade(null)
        // Set score from finalScore if parsing fails
        if (data && data.finalScore !== null && data.finalScore !== undefined) {
          setScore(data.finalScore)
        } else {
          // Try to extract score from feedback text
          const scoreMatch = strippedFeedback.match(/SCORE:\s*(\d+)/i)
          if (scoreMatch) {
            setScore(parseInt(scoreMatch[1], 10))
          }
        }
      }
    } else {
      setParsedGrade(null)
      // Set score if it exists (including 0)
      if (data && data.finalScore !== null && data.finalScore !== undefined) {
        setScore(data.finalScore)
      } else if (data && data.finalScore === null) {
        // Reset to empty if no score exists
        setScore('')
      }
    }
  }, [data])

  // Reset image index when submission changes
  useEffect(() => {
    if (data?.imageUrls) {
      setCurrentImageIndex(0)
    }
  }, [data?.imageUrls])

  // Handle mark changes from GradeTable
  const handleMarkChange = (questionId: string, newMarks: number) => {
    const updated = new Map(markUpdates)
    updated.set(questionId, newMarks)
    setMarkUpdates(updated)

    // Reconstruct feedback with new marks
    if (parsedGrade) {
      const reconstructed = reconstructFeedback(parsedGrade, updated)
      setFeedback(reconstructed)
      
      // Update score based on new total
      const newTotal = parsedGrade.sections.reduce((total, section) => {
        return total + section.questions.reduce((sum, q) => {
          const qId = `${section.sectionName}-Q${q.questionNumber}`
          return sum + (updated.get(qId) ?? q.awardedMarks)
        }, 0)
      }, 0)
      setScore(newTotal)
    }
  }

  // Auto-generate draft if no feedback exists
  const generateDraftMutation = useMutation({
    mutationFn: (regenerate: boolean = false) => generateDraft(submissionId, data?.imageUrls || [], regenerate),
    onSuccess: (result) => {
      if (result.success && result.feedback) {
        // Strip markdown formatting from AI feedback for cleaner display
        const strippedFeedback = stripMarkdown(result.feedback)
        setFeedback(strippedFeedback)
        
        // Try to parse and get score from parsed grade first
        try {
          const parsed = parseGradeFeedback(strippedFeedback)
          if (parsed.sections.length > 0) {
            setParsedGrade(parsed)
            // Set score from parsed grade if available (including 0)
            if (parsed.totalScore !== null && parsed.totalScore !== undefined) {
              setScore(parsed.totalScore)
            } else if (result.score !== null && result.score !== undefined) {
              setScore(result.score)
            } else {
              // Try to extract score from feedback text
              const scoreMatch = strippedFeedback.match(/SCORE:\s*(\d+)/i)
              if (scoreMatch) {
                setScore(parseInt(scoreMatch[1], 10))
              }
            }
          } else {
            // Set AI-generated score if no parsed grade
            if (result.score !== null && result.score !== undefined) {
              setScore(result.score)
            } else {
              // Try to extract score from feedback text
              const scoreMatch = strippedFeedback.match(/SCORE:\s*(\d+)/i)
              if (scoreMatch) {
                setScore(parseInt(scoreMatch[1], 10))
              }
            }
          }
        } catch (error) {
          console.error('Error parsing grade feedback:', error)
          // Set AI-generated score if parsing fails
          if (result.score !== null && result.score !== undefined) {
            setScore(result.score)
          } else {
            // Try to extract score from feedback text
            const scoreMatch = strippedFeedback.match(/SCORE:\s*(\d+)/i)
            if (scoreMatch) {
              setScore(parseInt(scoreMatch[1], 10))
            }
          }
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
      generateDraftMutation.mutate(false)
    }
  }, [data])

  const retriggerAIMutation = useMutation({
    mutationFn: () => retriggerAIGrading(submissionId),
    onSuccess: (result) => {
      if (result.success) {
        queryClient.invalidateQueries({ queryKey: ['submission', submissionId] })
        queryClient.invalidateQueries({ queryKey: ['submissions'] })
      } else {
        alert(result.error || 'Failed to retrigger AI grading. Please try again.')
      }
    },
  })

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

  const nextImage = () => {
    if (data?.imageUrls && currentImageIndex < data.imageUrls.length - 1) {
      setCurrentImageIndex(currentImageIndex + 1)
    }
  }

  const prevImage = () => {
    if (currentImageIndex > 0) {
      setCurrentImageIndex(currentImageIndex - 1)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose} fullscreen>
      <DialogContent className="p-0">
        <DialogHeader className="border-b px-8 py-6">
          <DialogClose onClose={handleClose} />
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">
                {isLoading ? 'Loading...' : data ? `${data.studentName}` : 'Grading'}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {data?.studentEmail}
              </DialogDescription>
            </div>
            <div className="flex items-center gap-6">
              {data && (
                <>
                  <Badge
                    variant={
                      data.processingStatus === 'ready' || data.status === 'graded'
                        ? 'default'
                        : 'secondary'
                    }
                    className="text-base px-4 py-2"
                  >
                    {data.processingStatus === 'processing_ai' ? (
                      <span className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
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
                    <div className="text-2xl font-bold">
                      Score: {data.finalScore}/100
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogHeader>

        <DialogBody className="p-0 overflow-hidden">
          {isLoading ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-12 w-12 animate-spin text-zinc-500" />
            </div>
          ) : error || !data ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-xl text-red-500">Failed to load submission</p>
                <Button onClick={handleClose} className="mt-4" size="lg">
                  Close
                </Button>
              </div>
            </div>
          ) : data.status === 'graded' ? (
            /* Graded View - Focus on Feedback and Audio */
            <div className="flex flex-col h-full">
              {/* Prominent Audio Section at Top */}
              {data.audioUrl && (
                <div className="border-b bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/30 dark:to-purple-900/30 p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <Volume2 className="h-7 w-7 text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-xl font-semibold text-blue-900 dark:text-blue-100">
                        Audio Feedback
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        Listen to personalized feedback for {data.studentName}
                      </p>
                    </div>
                  </div>
                  <audio 
                    controls 
                    src={data.audioUrl} 
                    className="w-full h-16"
                    preload="metadata"
                  />
                </div>
              )}
              {data.processingStatus === 'generating_audio' && (
                <div className="border-b bg-blue-50 dark:bg-blue-900/30 p-6">
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-600 dark:text-blue-400" />
                    <div>
                      <p className="text-lg font-semibold text-blue-900 dark:text-blue-100">
                        Generating Audio Feedback
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        This will appear here when ready
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Feedback Display - Full Width */}
              <div className="flex-1 overflow-y-auto px-8 py-6">
                <div className="max-w-4xl mx-auto space-y-6">
                  {/* Score Display */}
                  <div className="text-center">
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-2">Final Score</p>
                    <p className="text-5xl font-bold text-blue-600 dark:text-blue-400">
                      {data.finalScore}/100
                    </p>
                  </div>

                  {/* Feedback Text */}
                  <div className="space-y-3">
                    <h3 className="text-xl font-semibold">Feedback</h3>
                    <div className="rounded-lg border bg-white dark:bg-zinc-800 p-6">
                      <p className="whitespace-pre-wrap text-base leading-relaxed">
                        {data.aiFeedback || feedback}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-4">
                    {!data.feedbackApproved && (
                      <Button
                        onClick={() => approveMutation.mutate()}
                        disabled={approveMutation.isPending}
                        variant="outline"
                        className="flex-1"
                        size="lg"
                      >
                        {approveMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Approving...
                          </>
                        ) : (
                          <>
                            <Check className="mr-2 h-5 w-5" />
                            Approve Feedback
                          </>
                        )}
                      </Button>
                    )}
                    {data.feedbackApproved && !data.feedbackSent && (
                      <Button
                        onClick={() => sendMutation.mutate()}
                        disabled={sendMutation.isPending}
                        className="flex-1 bg-blue-600 hover:bg-blue-700"
                        size="lg"
                      >
                        {sendMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="mr-2 h-5 w-5" />
                            Send Feedback to Student
                          </>
                        )}
                      </Button>
                    )}
                    {data.feedbackSent && (
                      <div className="flex-1 rounded-lg bg-green-50 border border-green-200 p-4 dark:bg-green-900/20 dark:border-green-800">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                          <p className="text-base font-medium text-green-900 dark:text-green-100">
                            Feedback sent to {data.studentEmail}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Collapsible Images Section */}
                  <details className="mt-6">
                    <summary className="cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100">
                      View Submitted Papers ({data.imageUrls?.length || 0} pages)
                    </summary>
                    <div className="mt-4 grid grid-cols-2 gap-4">
                      {data.imageUrls?.map((url: string, idx: number) => (
                        <div key={idx} className="relative aspect-[3/4] border rounded-lg overflow-hidden">
                          <Image
                            src={url}
                            alt={`Page ${idx + 1}`}
                            fill
                            className="object-contain"
                            unoptimized
                          />
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-full">
              {/* Left: Image Viewer - Large and Simple */}
              <div className="w-1/2 border-r bg-zinc-100 dark:bg-zinc-800 flex flex-col">
                <div className="flex-1 flex items-center justify-center p-8 relative">
                  {data.imageUrls && data.imageUrls.length > 0 && (
                    <>
                      <div className="relative w-full h-full max-w-4xl">
                        <Image
                          src={data.imageUrls[currentImageIndex]}
                          alt={`Exam page ${currentImageIndex + 1}`}
                          fill
                          className="object-contain"
                          unoptimized
                        />
                      </div>
                      
                      {/* Navigation Arrows - Large and Easy to Click */}
                      {data.imageUrls.length > 1 && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={prevImage}
                            disabled={currentImageIndex === 0}
                            className="absolute left-4 h-16 w-16 bg-white/90 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800"
                          >
                            <ChevronLeft className="h-8 w-8" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={nextImage}
                            disabled={currentImageIndex === data.imageUrls.length - 1}
                            className="absolute right-4 h-16 w-16 bg-white/90 hover:bg-white dark:bg-zinc-800/90 dark:hover:bg-zinc-800"
                          >
                            <ChevronRight className="h-8 w-8" />
                          </Button>
                        </>
                      )}
                    </>
                  )}
                </div>
                
                {/* Image Counter - Simple and Clear */}
                {data.imageUrls && data.imageUrls.length > 1 && (
                  <div className="border-t bg-white dark:bg-zinc-900 px-8 py-4 text-center">
                    <p className="text-lg font-medium">
                      Page {currentImageIndex + 1} of {data.imageUrls.length}
                    </p>
                  </div>
                )}
              </div>

              {/* Right: Feedback Editor - Simple and Large */}
              <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 relative">
                <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6">
                  {/* Status Messages */}
                  {data.processingStatus === 'processing_ai' && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 dark:bg-blue-900/20 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                        <p className="text-base font-medium text-blue-900 dark:text-blue-100">
                          AI is generating feedback... This will update automatically.
                        </p>
                      </div>
                    </div>
                  )}

                  {generateDraftMutation.isPending && (
                    <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 dark:bg-blue-900/20 dark:border-blue-800">
                      <div className="flex items-center gap-3">
                        <Loader2 className="h-5 w-5 animate-spin text-blue-600 dark:text-blue-400" />
                        <p className="text-base font-medium text-blue-900 dark:text-blue-100">
                          Generating AI feedback...
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Simple AI Feedback Button - Only show if no feedback and not processing */}
                  {data &&
                    data.status !== 'graded' &&
                    data.processingStatus !== 'processing_ai' &&
                    !data.aiFeedback && (
                      <Button
                        onClick={() => retriggerAIMutation.mutate()}
                        disabled={retriggerAIMutation.isPending}
                        className="w-full"
                        size="lg"
                      >
                        {retriggerAIMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Generating AI Feedback...
                          </>
                        ) : (
                          <>
                            Generate AI Feedback
                          </>
                        )}
                      </Button>
                    )}

                  {/* Simple Score Input */}
                  <div className="space-y-2">
                    <label className="text-lg font-semibold">
                      Final Score
                    </label>
                    <div className="flex items-center gap-3">
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={score === '' ? '' : String(score)}
                        onChange={(e) => {
                          const newScore = e.target.value === '' ? '' : parseInt(e.target.value)
                          setScore(newScore)
                          // Update feedback text score if it exists
                          if (typeof newScore === 'number' && feedback) {
                            const updatedFeedback = feedback.replace(/SCORE:\s*\d+/i, `SCORE: ${newScore}`)
                            setFeedback(updatedFeedback)
                          }
                        }}
                        placeholder="0"
                        disabled={data.status === 'graded'}
                        className="text-3xl h-20 px-6 font-bold text-center"
                      />
                      <span className="text-2xl font-semibold text-zinc-600 dark:text-zinc-400">/ 100</span>
                      {data?.finalScore !== null && data?.finalScore !== undefined && score !== data.finalScore && (
                        <span className="text-sm text-zinc-500">
                          (AI suggested: {data.finalScore})
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Simple Feedback Editor - Always show text */}
                  <div className="space-y-3 flex-1 flex flex-col">
                    <label className="text-lg font-semibold">
                      Feedback to Student
                    </label>
                    
                    <Textarea
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder={
                        data.processingStatus === 'processing_ai'
                          ? 'AI is generating feedback...'
                          : 'AI feedback will appear here. You can edit it before finalizing.'
                      }
                      className="flex-1 text-base min-h-[300px] p-4 resize-none"
                      disabled={data.processingStatus === 'processing_ai' && !feedback}
                    />
                  </div>

                </div>

                {/* Floating Button for Mark Adjustment */}
                {parsedGrade && parsedGrade.sections.length > 0 && (
                  <div className="absolute bottom-24 right-8 z-50">
                    <Button
                      onClick={() => setShowMarkAdjustment(true)}
                      size="lg"
                      className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-shadow"
                      title="Adjust Marks"
                    >
                      <Calculator className="h-6 w-6" />
                    </Button>
                  </div>
                )}

                {/* Simple Action Button */}
                <div className="border-t bg-zinc-50 dark:bg-zinc-800 px-8 py-6">
                  {data.status === 'graded' ? (
                    <div className="text-center py-4">
                      <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400 mx-auto mb-2" />
                      <p className="text-lg font-semibold text-green-900 dark:text-green-100">
                        Grade Saved
                      </p>
                      <Button
                        onClick={handleClose}
                        variant="outline"
                        className="mt-4"
                      >
                        Close
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handleFinalize}
                      disabled={
                        finalizeMutation.isPending ||
                        !feedback.trim() ||
                        score === '' ||
                        data.processingStatus === 'processing_ai'
                      }
                      size="lg"
                      className="w-full text-lg h-14"
                    >
                      {finalizeMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="mr-2 h-5 w-5" />
                          Save Grade
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogBody>
      </DialogContent>

      {/* Mark Adjustment Popup */}
      <Dialog open={showMarkAdjustment} onOpenChange={setShowMarkAdjustment}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-2xl">Adjust Marks</DialogTitle>
            <DialogDescription>
              Review and adjust marks for each question. Changes will update the feedback and score automatically.
            </DialogDescription>
            <DialogClose onClose={() => setShowMarkAdjustment(false)} />
          </DialogHeader>
          <DialogBody className="overflow-y-auto flex-1">
            {parsedGrade && parsedGrade.sections.length > 0 && (
              <div className="p-4">
                <GradeTable
                  parsedGrade={parsedGrade}
                  onMarksChange={handleMarkChange}
                />
              </div>
            )}
          </DialogBody>
        </DialogContent>
      </Dialog>
    </Dialog>
  )
}

