'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'

export async function createSubmission(data: {
  studentName: string
  studentEmail: string
  imageUrls: string[]
  magicLinkToken: string
  submittedBy?: 'student' | 'teacher'
}) {
  try {
    // Validate magic link
    const magicLink = await prisma.magicLink.findUnique({
      where: { token: data.magicLinkToken },
      include: {
        test: {
          include: {
            organization: true,
          },
        },
      },
    })

    if (!magicLink) {
      return { success: false, error: 'Invalid magic link' }
    }

    if (magicLink.expiresAt && magicLink.expiresAt < new Date()) {
      return { success: false, error: 'Magic link has expired' }
    }

    // Check if student has already submitted (unless it's a teacher submission)
    if (data.submittedBy !== 'teacher') {
      const existingSubmission = await prisma.submission.findFirst({
        where: {
          testId: magicLink.testId,
          studentEmail: data.studentEmail,
        },
      })

      if (existingSubmission) {
        return { success: false, error: 'You have already submitted this test' }
      }
    }

    // Check if student user exists
    const student = await prisma.user.findUnique({
      where: { email: data.studentEmail },
    })

    // Merge images on server
    const { mergeImages } = await import('@/lib/image-merge')
    const mergedImageUrl = await mergeImages(data.imageUrls, magicLink.testId, data.studentEmail)

    // Create submission with processing_ai status
    const submission = await prisma.submission.create({
      data: {
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        imageUrls: data.imageUrls,
        mergedImageUrl: mergedImageUrl,
        status: 'pending',
        processingStatus: 'processing_ai',
        testId: magicLink.testId,
        organizationId: magicLink.test.organizationId,
        studentId: student?.id,
        magicLinkId: magicLink.id,
        submittedBy: data.submittedBy || 'student',
      },
    })

    // Mark magic link as used (for analytics, but don't block future uses)
    if (!magicLink.used) {
      await prisma.magicLink.update({
        where: { id: magicLink.id },
        data: {
          used: true,
          usedAt: new Date(),
        },
      })
    }

    // Trigger AI generation via queue (controls concurrency) - use merged image if available
    const { aiQueue } = await import('@/lib/ai-queue')
    const imagesForAI = mergedImageUrl ? [mergedImageUrl] : data.imageUrls
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

    revalidatePath(`/teacher/tests/${magicLink.testId}`)
    return { success: true, id: submission.id }
  } catch (error) {
    console.error('Error creating submission:', error)
    return { success: false, error: 'Failed to create submission' }
  }
}

export async function getSubmissions(testId?: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:view')

  const where: any = {
    organizationId: user.organizationId,
  }

  if (testId) {
    where.testId = testId
  } else if (user.role === UserRole.TEACHER) {
    // For teachers, only show submissions for their tests
    const teacherTests = await prisma.test.findMany({
      where: {
        teacherId: user.id,
        organizationId: user.organizationId,
      },
      select: {
        id: true,
      },
    })
    where.testId = {
      in: teacherTests.map((test) => test.id),
    }
  }

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      test: {
        select: {
          id: true,
          name: true,
          course: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      },
      student: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  // Filter out submissions without tests (shouldn't happen, but TypeScript needs this)
  // Type assertion: we know test is not null because testId is required in the schema
  type SubmissionWithTest = typeof submissions[0] & { test: NonNullable<typeof submissions[0]['test']> }
  return submissions.filter((submission): submission is SubmissionWithTest => submission.test !== null)
}

export async function getSubmission(submissionId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:view')

  const submission = await prisma.submission.findFirst({
    where: {
      id: submissionId,
      organizationId: user.organizationId,
    },
    include: {
      test: {
        include: {
          course: true,
        },
      },
      student: true,
    },
  })

  if (!submission) {
    throw new Error('Submission not found')
  }

  return submission
}

