import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getTeachers } from '@/actions/teachers'
import { UserRole } from '@prisma/client'
import { TeachersTable } from '@/components/admin/TeachersTable'

export default async function TeachersPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  const teachers = await getTeachers()

  return <TeachersTable initialTeachers={teachers} />
}
