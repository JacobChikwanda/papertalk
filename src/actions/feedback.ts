'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

/**
 * Approve feedback for a submission
 */
export async function approveFeedback(submissionId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:grade')

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        organizationId: user.organizationId,
        status: 'graded',
      },
    })

    if (!submission) {
      return { success: false, error: 'Submission not found' }
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        feedbackApproved: true,
      },
    })

    revalidatePath(`/grade/${submissionId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error approving feedback:', error)
    return { success: false, error: 'Failed to approve feedback' }
  }
}

/**
 * Send feedback to student via email (internal function, can be called without auth check)
 */
export async function sendFeedbackInBackground(submissionId: string, studentEmail: string) {
  try {
    // TODO: Implement email sending logic here
    // For now, just mark as sent
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        feedbackSent: true,
        feedbackSentAt: new Date(),
      },
    })

    revalidatePath(`/grade/${submissionId}`)
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error) {
    console.error('Error sending feedback:', error)
    return { success: false, error: 'Failed to send feedback' }
  }
}

/**
 * Send feedback to student via email
 */
export async function sendFeedback(submissionId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:grade')

  try {
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        organizationId: user.organizationId,
        status: 'graded',
      },
    })

    if (!submission) {
      return { success: false, error: 'Submission not found' }
    }

    return await sendFeedbackInBackground(submissionId, submission.studentEmail)
  } catch (error) {
    console.error('Error sending feedback:', error)
    return { success: false, error: 'Failed to send feedback' }
  }
}

/**
 * Bulk send feedback to multiple submissions
 */
export async function bulkSendFeedback(submissionIds: string[]) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:grade')

  try {
    const submissions = await prisma.submission.findMany({
      where: {
        id: { in: submissionIds },
        organizationId: user.organizationId,
        status: 'graded',
        feedbackApproved: true, // Only send approved feedback
      },
    })

    if (submissions.length === 0) {
      return { success: false, error: 'No approved submissions found' }
    }

    const now = new Date()
    await prisma.submission.updateMany({
      where: {
        id: { in: submissions.map(s => s.id) },
      },
      data: {
        feedbackSent: true,
        feedbackSentAt: now,
      },
    })

    // TODO: Implement bulk email sending logic here

    revalidatePath('/dashboard')
    return { success: true, count: submissions.length }
  } catch (error) {
    console.error('Error bulk sending feedback:', error)
    return { success: false, error: 'Failed to bulk send feedback' }
  }
}

