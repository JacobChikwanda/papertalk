import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getSubmissions } from '@/actions/submissions'
import { getCourses } from '@/actions/courses'
import { UserRole } from '@prisma/client'
import { SubmissionsView } from '@/components/teacher/SubmissionsView'

export default async function SubmissionsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.TEACHER && user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  const [submissions, courses] = await Promise.all([
    getSubmissions(),
    getCourses(),
  ])

  return <SubmissionsView initialSubmissions={submissions} courses={courses} />
}
