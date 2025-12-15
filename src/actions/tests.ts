'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { revalidatePath } from 'next/cache'

export async function createTest(data: {
  name: string
  description?: string
  courseId: string
  testPaperFile: File
}) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:create')

  // Verify course belongs to user's organization and teacher
  const course = await prisma.course.findFirst({
    where: {
      id: data.courseId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
  })

  if (!course) {
    return { success: false, error: 'Course not found' }
  }

  try {
    // Upload test paper to Supabase Storage using admin client (bypasses RLS)
    const { createAdminStorageClient } = await import('@/lib/supabase-server')
    const supabase = createAdminStorageClient()
    const fileName = `test-papers/${data.courseId}/${Date.now()}-${data.testPaperFile.name}`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exams')
      .upload(fileName, data.testPaperFile, {
        contentType: data.testPaperFile.type,
        upsert: false,
      })

    if (uploadError) {
      return { success: false, error: `Failed to upload test paper: ${uploadError.message}` }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('exams').getPublicUrl(fileName)

    // Create test
    const test = await prisma.test.create({
      data: {
        name: data.name,
        description: data.description,
        courseId: data.courseId,
        teacherId: user.id,
        organizationId: user.organizationId,
        testPaper: {
          create: {
            fileUrl: publicUrl,
            fileName: data.testPaperFile.name,
          },
        },
      },
      include: {
        testPaper: true,
        course: true,
      },
    })

    revalidatePath('/teacher')
    return { success: true, test }
  } catch (error) {
    console.error('Error creating test:', error)
    return { success: false, error: 'Failed to create test' }
  }
}

export async function getTests(courseId?: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:view')

  const where: any = {
    organizationId: user.organizationId,
    teacherId: user.id,
  }

  if (courseId) {
    where.courseId = courseId
  }

  const tests = await prisma.test.findMany({
    where,
    include: {
      course: {
        select: {
          id: true,
          name: true,
        },
      },
      testPaper: true,
      _count: {
        select: {
          submissions: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return tests
}

export async function getTest(testId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:view')

  // Build where clause - teachers can only see their own tests, admins can see all in org
  const where: any = {
    id: testId,
    organizationId: user.organizationId,
  }

  // Only restrict by teacherId if user is a teacher (not admin)
  if (user.role === 'TEACHER') {
    where.teacherId = user.id
  }

  const test = await prisma.test.findFirst({
    where,
    include: {
      course: true,
      testPaper: true,
      submissions: {
        include: {
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
      },
      magicLinks: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!test) {
    throw new Error('Test not found')
  }

  return test
}

export async function updateTest(testId: string, data: {
  name?: string
  description?: string
}) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:edit')

  await prisma.test.updateMany({
    where: {
      id: testId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  })

  revalidatePath('/teacher')
  return { success: true }
}

export async function deleteTest(testId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'test:delete')

  await prisma.test.deleteMany({
    where: {
      id: testId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
  })

  revalidatePath('/teacher')
  return { success: true }
}

