'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, CheckCircle2, Clock, Trash2 } from 'lucide-react'
import { GradingModal } from './GradingModal'
import { deleteSubmission, deleteSubmissions } from '@/actions/delete-submission'

interface Submission {
  id: string
  studentName: string
  studentEmail: string
  status: string
  processingStatus: string
  finalScore: number | null
  createdAt: Date
}

interface SubmissionsTableProps {
  testId: string
  initialSubmissions: Submission[]
}

async function fetchSubmissions(testId: string) {
  const res = await fetch(`/api/submissions?testId=${testId}`)
  if (!res.ok) {
    throw new Error('Failed to fetch submissions')
  }
  return res.json()
}

function getProcessingStatusBadge(status: string) {
  switch (status) {
    case 'processing_ai':
      return (
        <Badge variant="secondary" className="flex items-center gap-1">
          <Loader2 className="h-3 w-3 animate-spin" />
          Processing AI...
        </Badge>
      )
    case 'ready':
      return (
        <Badge variant="default" className="bg-green-600 hover:bg-green-700">
          Ready to Grade
        </Badge>
      )
    case 'graded':
      return (
        <Badge variant="default">
          <CheckCircle2 className="mr-1 h-3 w-3" />
          Graded
        </Badge>
      )
    case 'pending':
    default:
      return (
        <Badge variant="secondary">
          <Clock className="mr-1 h-3 w-3" />
          Pending
        </Badge>
      )
  }
}

export function SubmissionsTable({ testId, initialSubmissions }: SubmissionsTableProps) {
  const queryClient = useQueryClient()
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  // Poll for updates every 5 seconds
  const { data: submissions = initialSubmissions } = useQuery({
    queryKey: ['submissions', testId],
    queryFn: () => fetchSubmissions(testId),
    initialData: initialSubmissions,
    refetchInterval: 5000, // Poll every 5 seconds
  })

  // Delete single submission mutation
  const deleteSubmissionMutation = useMutation({
    mutationFn: (id: string) => deleteSubmission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', testId] })
      setSelectedIds(new Set())
    },
  })

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteSubmissions(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', testId] })
      setSelectedIds(new Set())
    },
  })

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(submissions.map((s: Submission) => s.id)))
    } else {
      setSelectedIds(new Set())
    }
  }

  const handleSelectOne = (id: string, checked: boolean) => {
    const newSelected = new Set(selectedIds)
    if (checked) {
      newSelected.add(id)
    } else {
      newSelected.delete(id)
    }
    setSelectedIds(newSelected)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm('Are you sure you want to delete this submission? This action cannot be undone.')) {
      deleteSubmissionMutation.mutate(id)
    }
  }

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return
    if (
      confirm(
        `Are you sure you want to delete ${selectedIds.size} submission(s)? This action cannot be undone.`
      )
    ) {
      bulkDeleteMutation.mutate(Array.from(selectedIds))
    }
  }

  // Sort submissions: ready first, then by date
  const sortedSubmissions = [...submissions].sort((a, b) => {
    // Priority: ready > processing_ai > pending > graded
    const priority: Record<string, number> = {
      ready: 0,
      processing_ai: 1,
      pending: 2,
      graded: 3,
    }
    const aPriority = priority[a.processingStatus] ?? 4
    const bPriority = priority[b.processingStatus] ?? 4

    if (aPriority !== bPriority) {
      return aPriority - bPriority
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  if (submissions.length === 0) {
    return (
      <div className="rounded-lg border p-12 text-center">
        <p className="text-zinc-600 dark:text-zinc-400">No submissions yet</p>
      </div>
    )
  }

  const allSelected = submissions.length > 0 && selectedIds.size === submissions.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < submissions.length

  return (
    <>
      {selectedIds.size > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-blue-50 p-4 dark:bg-blue-950/20">
          <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
            {selectedIds.size} submission(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkDeleteMutation.isPending}
          >
            {bulkDeleteMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Selected
              </>
            )}
          </Button>
        </div>
      )}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAll}
                  onClick={(e) => e.stopPropagation()}
                />
              </TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Queue Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSubmissions.map((submission) => (
              <TableRow
                key={submission.id}
                className={
                  selectedIds.has(submission.id)
                    ? 'bg-blue-50/50 dark:bg-blue-950/20'
                    : submission.processingStatus === 'ready'
                      ? 'bg-green-50/50 dark:bg-green-950/10 cursor-pointer hover:bg-green-100/50 dark:hover:bg-green-950/20'
                      : submission.processingStatus === 'processing_ai'
                        ? 'bg-blue-50/50 dark:bg-blue-950/10'
                        : 'cursor-pointer'
                }
                onClick={() => {
                  // Only allow opening if not processing AI (unless already graded)
                  if (
                    submission.processingStatus !== 'processing_ai' ||
                    submission.status === 'graded'
                  ) {
                    setSelectedSubmissionId(submission.id)
                  }
                }}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedIds.has(submission.id)}
                    onCheckedChange={(checked) =>
                      handleSelectOne(submission.id, checked === true)
                    }
                  />
                </TableCell>
                <TableCell className="font-medium">
                  {submission.studentName}
                </TableCell>
                <TableCell>{submission.studentEmail}</TableCell>
                <TableCell>{getProcessingStatusBadge(submission.processingStatus)}</TableCell>
                <TableCell>
                  {submission.finalScore !== null ? (
                    <span className="font-medium">{submission.finalScore}/100</span>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(submission.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        if (
                          submission.processingStatus !== 'processing_ai' ||
                          submission.status === 'graded'
                        ) {
                          setSelectedSubmissionId(submission.id)
                        }
                      }}
                      disabled={submission.processingStatus === 'processing_ai' && submission.status !== 'graded'}
                    >
                      {submission.status === 'graded' ? 'View' : 'Grade'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDelete(submission.id, e)}
                      disabled={deleteSubmissionMutation.isPending}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
                    >
                      {deleteSubmissionMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      </div>

      {selectedSubmissionId && (
        <GradingModal
          open={!!selectedSubmissionId}
          onOpenChange={(open) => {
            if (!open) {
              setSelectedSubmissionId(null)
            }
          }}
          submissionId={selectedSubmissionId}
          onSuccess={() => {
            // Refresh submissions after grading
            setSelectedSubmissionId(null)
          }}
        />
      )}
    </>
  )
}

