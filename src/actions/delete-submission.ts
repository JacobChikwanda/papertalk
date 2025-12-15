'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { createAdminStorageClient } from '@/lib/supabase-server'

// Helper function to extract file path from Supabase URL
function extractFilePath(url: string): string | null {
  try {
    const urlObj = new URL(url)
    // Supabase storage URLs typically have the format:
    // https://[project].supabase.co/storage/v1/object/public/exams/[path]
    // or https://[project].supabase.co/storage/v1/object/sign/exams/[path]
    const pathMatch = urlObj.pathname.match(/\/storage\/v1\/object\/(public|sign)\/exams\/(.+)/)
    if (pathMatch) {
      return pathMatch[2]
    }
    // Fallback: try to extract from pathname directly
    const directMatch = urlObj.pathname.match(/\/exams\/(.+)/)
    if (directMatch) {
      return directMatch[1]
    }
    return null
  } catch {
    return null
  }
}

// Helper function to delete files from Supabase storage
async function deleteFilesFromStorage(urls: (string | null)[]): Promise<void> {
  const supabase = createAdminStorageClient()
  const filesToDelete: string[] = []

  for (const url of urls) {
    if (!url) continue
    const filePath = extractFilePath(url)
    if (filePath) {
      filesToDelete.push(filePath)
    }
  }

  if (filesToDelete.length > 0) {
    // Delete files from Supabase storage
    const { error } = await supabase.storage
      .from('exams')
      .remove(filesToDelete)

    if (error) {
      console.error('Error deleting files from storage:', error)
      // Don't throw - continue with database deletion even if file deletion fails
    }
  }
}

export async function deleteSubmission(submissionId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:delete')

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

    // Collect all file URLs to delete
    const filesToDelete: (string | null)[] = [
      ...submission.imageUrls,
      submission.mergedImageUrl,
      submission.audioUrl,
    ]

    // Delete files from storage
    await deleteFilesFromStorage(filesToDelete)

    // Delete submission from database
    await prisma.submission.delete({
      where: { id: submissionId },
    })

    revalidatePath(`/teacher/tests/${submission.testId}`)
    revalidatePath('/teacher/submissions')
    return { success: true }
  } catch (error) {
    console.error('Error deleting submission:', error)
    return { success: false, error: 'Failed to delete submission' }
  }
}

export async function deleteSubmissions(submissionIds: string[]) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:delete')

  if (!submissionIds || submissionIds.length === 0) {
    return { success: false, error: 'No submissions selected' }
  }

  try {
    // Verify all submissions belong to user's organization
    const submissions = await prisma.submission.findMany({
      where: {
        id: { in: submissionIds },
        organizationId: user.organizationId,
      },
    })

    if (submissions.length !== submissionIds.length) {
      return { success: false, error: 'Some submissions were not found or you do not have permission to delete them' }
    }

    // Collect all file URLs to delete
    const filesToDelete: (string | null)[] = []
    const testIds = new Set<string>()

    for (const submission of submissions) {
      filesToDelete.push(...submission.imageUrls)
      if (submission.mergedImageUrl) {
        filesToDelete.push(submission.mergedImageUrl)
      }
      if (submission.audioUrl) {
        filesToDelete.push(submission.audioUrl)
      }
      if (submission.testId) {
        testIds.add(submission.testId)
      }
    }

    // Delete files from storage
    await deleteFilesFromStorage(filesToDelete)

    // Delete submissions from database
    await prisma.submission.deleteMany({
      where: {
        id: { in: submissionIds },
        organizationId: user.organizationId,
      },
    })

    // Revalidate paths
    for (const testId of testIds) {
      revalidatePath(`/teacher/tests/${testId}`)
    }
    revalidatePath('/teacher/submissions')

    return { success: true, deletedCount: submissions.length }
  } catch (error) {
    console.error('Error deleting submissions:', error)
    return { success: false, error: 'Failed to delete submissions' }
  }
}

