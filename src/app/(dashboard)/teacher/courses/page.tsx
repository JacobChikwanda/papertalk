import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getCourses } from '@/actions/courses'
import { UserRole } from '@prisma/client'
import { CoursesView } from '@/components/teacher/CoursesView'

export default async function CoursesPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.TEACHER && user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  const courses = await getCourses()

  return <CoursesView initialCourses={courses} />
}

