'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { createAdminSupabaseClient } from '@/lib/supabase-client'
import { UserRole } from '@prisma/client'
import { revalidatePath } from 'next/cache'

export async function addTeacher(data: {
  name: string
  email: string
  password: string
}) {
  const user = await requireAuth()
  requirePermission(user.role, 'teacher:add')

  try {
    // Use admin client that doesn't affect the current session
    const supabase = createAdminSupabaseClient()

    // Create Supabase Auth user
    // Note: For production, use service role key with admin.createUser
    // For now, using signUp with a separate client to avoid session conflicts
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          name: data.name,
        },
      },
    })

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create teacher' }
    }

    // Create teacher in database
    const teacher = await prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        role: UserRole.TEACHER,
        organizationId: user.organizationId,
        supabaseUserId: authData.user.id,
      },
    })

    revalidatePath('/admin')
    revalidatePath('/admin/teachers')
    return { success: true, teacher }
  } catch (error) {
    console.error('Error adding teacher:', error)
    return { success: false, error: 'Failed to add teacher' }
  }
}

export async function getTeachers() {
  const user = await requireAuth()
  requirePermission(user.role, 'teacher:add')

  const teachers = await prisma.user.findMany({
    where: {
      organizationId: user.organizationId,
      role: UserRole.TEACHER,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      disabled: true,
      _count: {
        select: {
          courses: true,
          tests: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  })

  return teachers
}

export async function getTeacher(teacherId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'teacher:add')

  const teacher = await prisma.user.findFirst({
    where: {
      id: teacherId,
      organizationId: user.organizationId,
      role: UserRole.TEACHER,
    },
    select: {
      id: true,
      name: true,
      email: true,
      createdAt: true,
      disabled: true,
      _count: {
        select: {
          courses: true,
          tests: true,
        },
      },
    },
  })

  if (!teacher) {
    throw new Error('Teacher not found')
  }

  return teacher
}

export async function toggleTeacherStatus(teacherId: string, disabled: boolean) {
  const user = await requireAuth()
  requirePermission(user.role, 'teacher:add')

  try {
    await prisma.user.updateMany({
      where: {
        id: teacherId,
        organizationId: user.organizationId,
        role: UserRole.TEACHER,
      },
      data: {
        disabled,
      },
    })

    revalidatePath('/admin/teachers')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error toggling teacher status:', error)
    return { success: false, error: 'Failed to update teacher status' }
  }
}

export async function deleteTeacher(teacherId: string) {
  const user = await requireAuth()
  requirePermission(user.role, 'teacher:add')

  try {
    // Note: This will cascade delete courses, tests, etc. due to onDelete: Cascade
    await prisma.user.deleteMany({
      where: {
        id: teacherId,
        organizationId: user.organizationId,
        role: UserRole.TEACHER,
      },
    })

    revalidatePath('/admin/teachers')
    revalidatePath('/admin')
    return { success: true }
  } catch (error) {
    console.error('Error deleting teacher:', error)
    return { success: false, error: 'Failed to delete teacher' }
  }
}

