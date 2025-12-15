'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { randomBytes } from 'crypto'

export async function createMagicLink(testId: string, expiresInHours?: number) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:view')

  // Verify test belongs to user's organization and teacher
  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
  })

  if (!test) {
    return { success: false, error: 'Test not found' }
  }

  // Generate secure token
  const token = randomBytes(32).toString('hex')

  // Calculate expiration
  const expiresAt = expiresInHours
    ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
    : null

  const magicLink = await prisma.magicLink.create({
    data: {
      token,
      testId: test.id,
      expiresAt,
    },
  })

  revalidatePath(`/teacher/tests/${testId}`)
  return { success: true, magicLink }
}

export async function validateMagicLink(token: string, studentEmail?: string) {
  const magicLink = await prisma.magicLink.findUnique({
    where: { token },
    include: {
      test: {
        include: {
          course: true,
          testPaper: true,
        },
      },
    },
  })

  if (!magicLink) {
    return { valid: false, error: 'Invalid magic link' }
  }

  if (magicLink.expiresAt && magicLink.expiresAt < new Date()) {
    return { valid: false, error: 'Magic link has expired' }
  }

  // Check if student has already submitted (if email provided)
  if (studentEmail) {
    const existingSubmission = await prisma.submission.findFirst({
      where: {
        testId: magicLink.testId,
        studentEmail: studentEmail,
      },
    })

    if (existingSubmission) {
      return { valid: false, error: 'You have already submitted this test' }
    }
  }

  return { valid: true, magicLink }
}

export async function getMagicLinks(testId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:view')

  const test = await prisma.test.findFirst({
    where: {
      id: testId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
  })

  if (!test) {
    throw new Error('Test not found')
  }

  const magicLinks = await prisma.magicLink.findMany({
    where: { testId },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return magicLinks
}

