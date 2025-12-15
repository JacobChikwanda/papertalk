import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getCourse } from '@/actions/courses'
import { UserRole } from '@prisma/client'
import { CourseDetailView } from '@/components/teacher/CourseDetailView'

export default async function CourseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.TEACHER && user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  const course = await getCourse(id)

  return <CourseDetailView course={course} />
}
