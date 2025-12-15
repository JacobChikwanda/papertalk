import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { aiQueue } from '@/lib/ai-queue'
import { revalidatePath } from 'next/cache'

interface BulkSubmissionRequest {
  submissions: Array<{
    studentName: string
    studentEmail: string
    imageUrls: string[]
    magicLinkToken: string
  }>
  localIds: string[] // Local IDs from client for mapping
}

export async function POST(request: Request) {
  try {
    const body: BulkSubmissionRequest = await request.json()
    const { submissions, localIds } = body

    if (!submissions || !Array.isArray(submissions) || submissions.length === 0) {
      return NextResponse.json(
        { error: 'Invalid request: submissions array required' },
        { status: 400 }
      )
    }

    if (localIds.length !== submissions.length) {
      return NextResponse.json(
        { error: 'Invalid request: localIds must match submissions length' },
        { status: 400 }
      )
    }

    // Validate all magic links first (batch validation)
    const tokens = submissions.map((s) => s.magicLinkToken)
    const magicLinks = await prisma.magicLink.findMany({
      where: {
        token: { in: tokens },
      },
      include: {
        test: {
          include: {
            organization: true,
          },
        },
      },
    })

    const magicLinkMap = new Map(magicLinks.map((link) => [link.token, link]))

    // Validate all magic links exist and are valid
    const validationErrors: string[] = []
    submissions.forEach((submission, index) => {
      const magicLink = magicLinkMap.get(submission.magicLinkToken)
      if (!magicLink) {
        validationErrors.push(`Submission ${index + 1}: Invalid magic link`)
      } else if (magicLink.expiresAt && magicLink.expiresAt < new Date()) {
        validationErrors.push(`Submission ${index + 1}: Magic link expired`)
      }
    })

    if (validationErrors.length > 0) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationErrors },
        { status: 400 }
      )
    }

    // Use transaction to create all submissions atomically
    const results = await prisma.$transaction(
      async (tx) => {
        const results: Array<{
          localId: string
          success: boolean
          serverId?: string
          error?: string
        }> = []

        // Get all students in batch (for efficiency)
        const emails = submissions.map((s) => s.studentEmail)
        const students = await tx.user.findMany({
          where: { email: { in: emails } },
        })
        const studentMap = new Map(students.map((s) => [s.email, s]))

        // Track which magic links we've marked as used (for analytics)
        const usedMagicLinkIds = new Set<string>()

        for (let i = 0; i < submissions.length; i++) {
          const submission = submissions[i]
          const localId = localIds[i]
          const magicLink = magicLinkMap.get(submission.magicLinkToken)!

          try {
            // Check if student has already submitted
            const existingSubmission = await tx.submission.findFirst({
              where: {
                testId: magicLink.testId,
                studentEmail: submission.studentEmail,
              },
            })

            if (existingSubmission) {
              results.push({
                localId,
                success: false,
                error: 'You have already submitted this test',
              })
              continue
            }

            // Merge images on server
            const { mergeImages } = await import('@/lib/image-merge')
            const mergedImageUrl = await mergeImages(
              submission.imageUrls,
              magicLink.testId,
              submission.studentEmail
            )

            // Create submission
            const created = await tx.submission.create({
              data: {
                studentName: submission.studentName,
                studentEmail: submission.studentEmail,
                imageUrls: submission.imageUrls,
                mergedImageUrl: mergedImageUrl,
                status: 'pending',
                processingStatus: 'processing_ai',
                testId: magicLink.testId,
                organizationId: magicLink.test.organizationId,
                studentId: studentMap.get(submission.studentEmail)?.id,
                magicLinkId: magicLink.id,
                submittedBy: 'student',
              },
            })

            // Mark magic link as used (for analytics, but don't block future uses)
            if (!usedMagicLinkIds.has(magicLink.id) && !magicLink.used) {
              await tx.magicLink.update({
                where: { id: magicLink.id },
                data: {
                  used: true,
                  usedAt: new Date(),
                },
              })
              usedMagicLinkIds.add(magicLink.id)
            }

            // Add to AI queue (non-blocking) - use merged image if available
            const imagesForAI = mergedImageUrl ? [mergedImageUrl] : submission.imageUrls
            aiQueue.add(created.id, imagesForAI).catch((error) => {
              console.error(`Error queuing AI for submission ${created.id}:`, error)
              // Update status on error
              prisma.submission
                .update({
                  where: { id: created.id },
                  data: { processingStatus: 'pending' },
                })
                .catch(console.error)
            })

            results.push({
              localId,
              success: true,
              serverId: created.id,
            })
          } catch (error: any) {
            console.error(`Error creating submission ${localId}:`, error)
            results.push({
              localId,
              success: false,
              error: error.message || 'Failed to create submission',
            })
          }
        }

        return results
      },
      {
        timeout: 30000, // 30 second timeout for transaction
      }
    )

    // Revalidate paths for any successful submissions
    const testIds = new Set<string>()
    submissions.forEach((submission, index) => {
      const result = results[index]
      if (result.success) {
        const magicLink = magicLinkMap.get(submission.magicLinkToken)
        if (magicLink) {
          testIds.add(magicLink.testId)
        }
      }
    })

    // Revalidate test pages
    for (const testId of testIds) {
      revalidatePath(`/teacher/tests/${testId}`)
    }

    // Return results
    return NextResponse.json(results)
  } catch (error: any) {
    console.error('Error in bulk submission:', error)
    return NextResponse.json(
      { error: 'Failed to process bulk submissions', details: error.message },
      { status: 500 }
    )
  }
}

