'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function retriggerAIGrading(submissionId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:grade')

  try {
    // Verify submission belongs to user's organization
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        organizationId: user.organizationId,
      },
    })

    if (!submission) {
      return { success: false, error: 'Submission not found' }
    }

    // Don't retrigger if already graded
    if (submission.status === 'graded') {
      return { success: false, error: 'Cannot retrigger AI grading for already graded submission' }
    }

    // Update status to processing_ai
    await prisma.submission.update({
      where: { id: submissionId },
      data: { processingStatus: 'processing_ai' },
    })

    // Trigger AI generation via queue (controls concurrency) - use merged image if available
    const { aiQueue } = await import('@/lib/ai-queue')
    const imagesForAI = submission.mergedImageUrl ? [submission.mergedImageUrl] : submission.imageUrls
    aiQueue.add(submission.id, imagesForAI).catch((error) => {
      console.error('Error queuing AI generation:', error)
      // Update status back to pending on queue error
      prisma.submission
        .update({
          where: { id: submission.id },
          data: { processingStatus: 'pending' },
        })
        .catch(console.error)
    })

    revalidatePath(`/teacher/tests/${submission.testId}`)
    revalidatePath(`/grade/${submissionId}`)
    return { success: true }
  } catch (error) {
    console.error('Error retriggering AI grading:', error)
    return { success: false, error: 'Failed to retrigger AI grading' }
  }
}

