'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { UserRole } from '@prisma/client'
import { mergeImages } from '@/lib/image-merge'
import { aiQueue } from '@/lib/ai-queue'

export async function createTeacherSubmission(data: {
  testId: string
  studentName: string
  studentEmail: string
  imageUrls: string[]
}) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:view')

  try {
    // Verify test belongs to user's organization
    const test = await prisma.test.findFirst({
      where: {
        id: data.testId,
        organizationId: user.organizationId,
      },
      include: {
        organization: true,
      },
    })

    if (!test) {
      return { success: false, error: 'Test not found' }
    }

    // Check if student has already submitted
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        testId: data.testId,
        studentEmail: data.studentEmail,
      },
    })

    // If submission exists, update it (teacher override)
    if (existingSubmission) {
      // Merge images on server
      const mergedImageUrl = await mergeImages(data.imageUrls, data.testId, data.studentEmail)

      // Update existing submission
      const updated = await prisma.submission.update({
        where: { id: existingSubmission.id },
        data: {
          studentName: data.studentName,
          imageUrls: data.imageUrls,
          mergedImageUrl: mergedImageUrl,
          status: 'pending', // Reset status when teacher updates
          processingStatus: 'processing_ai',
          submittedBy: 'teacher',
        },
      })

      // Trigger AI generation via queue - use merged image if available
      const imagesForAI = mergedImageUrl ? [mergedImageUrl] : data.imageUrls
      aiQueue.add(updated.id, imagesForAI).catch((error) => {
        console.error('Error queuing AI generation:', error)
        prisma.submission
          .update({
            where: { id: updated.id },
            data: { processingStatus: 'pending' },
          })
          .catch(console.error)
      })

      revalidatePath(`/teacher/tests/${data.testId}`)
      return { success: true, id: updated.id, updated: true }
    }

    // Check if student user exists
    const student = await prisma.user.findUnique({
      where: { email: data.studentEmail },
    })

    // Merge images on server
    const mergedImageUrl = await mergeImages(data.imageUrls, data.testId, data.studentEmail)

    // Create submission
    const submission = await prisma.submission.create({
      data: {
        studentName: data.studentName,
        studentEmail: data.studentEmail,
        imageUrls: data.imageUrls,
        mergedImageUrl: mergedImageUrl,
        status: 'pending',
        processingStatus: 'processing_ai',
        testId: data.testId,
        organizationId: test.organizationId,
        studentId: student?.id,
        submittedBy: 'teacher',
      },
    })

    // Trigger AI generation via queue - use merged image if available
    const imagesForAI = mergedImageUrl ? [mergedImageUrl] : data.imageUrls
    aiQueue.add(submission.id, imagesForAI).catch((error) => {
      console.error('Error queuing AI generation:', error)
      prisma.submission
        .update({
          where: { id: submission.id },
          data: { processingStatus: 'pending' },
        })
        .catch(console.error)
    })

    revalidatePath(`/teacher/tests/${data.testId}`)
    return { success: true, id: submission.id }
  } catch (error: any) {
    console.error('Error creating teacher submission:', error)
    if (error.code === 'P2002') {
      return { success: false, error: 'Student has already submitted this test' }
    }
    return { success: false, error: 'Failed to create submission' }
  }
}

