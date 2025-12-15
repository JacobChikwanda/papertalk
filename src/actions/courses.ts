'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

export async function createCourse(data: {
  name: string
  description?: string
}) {
  const user = await requireAuth()
  requirePermission(user.role, 'course:create')

  const course = await prisma.course.create({
    data: {
      name: data.name,
      description: data.description,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
    include: {
      tests: {
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  revalidatePath('/teacher')
  return course
}

export async function getCourses() {
  const user = await requireAuth()
  requirePermission(user.role, 'course:create')

  const courses = await prisma.course.findMany({
    where: {
      organizationId: user.organizationId,
      teacherId: user.id,
    },
    include: {
      tests: {
        select: {
          id: true,
          name: true,
          createdAt: true,
          _count: {
            select: {
              submissions: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return courses
}

export async function getCourse(courseId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'course:create')

  const course = await prisma.course.findFirst({
    where: {
      id: courseId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
    include: {
      tests: {
        include: {
          _count: {
            select: {
              submissions: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
  })

  if (!course) {
    throw new Error('Course not found')
  }

  return course
}

export async function updateCourse(courseId: string, data: {
  name?: string
  description?: string
}) {
  const user = await requireAuth()
  requirePermission(user.role, 'course:edit')

  const course = await prisma.course.updateMany({
    where: {
      id: courseId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
  })

  revalidatePath('/teacher')
  return course
}

export async function deleteCourse(courseId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'course:delete')

  await prisma.course.deleteMany({
    where: {
      id: courseId,
      organizationId: user.organizationId,
      teacherId: user.id,
    },
  })

  revalidatePath('/teacher')
  return { success: true }
}

