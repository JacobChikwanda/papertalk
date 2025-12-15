import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getCourses } from '@/actions/courses'
import { UserRole } from '@prisma/client'
import { TeacherDashboardView } from '@/components/teacher/TeacherDashboardView'

export default async function TeacherPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.TEACHER && user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  const courses = await getCourses()

  return <TeacherDashboardView initialCourses={courses} />
}
