import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { CourseForm } from '@/components/teacher/CourseForm'
import { UserRole } from '@prisma/client'

export default async function NewCoursePage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.TEACHER && user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Create New Course</h1>
      <CourseForm />
    </div>
  )
}

