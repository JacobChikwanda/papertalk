import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { UserRole } from '@prisma/client'
import { TeacherSettingsView } from '@/components/teacher/TeacherSettingsView'

export default async function TeacherSettingsPage() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  if (user.role !== UserRole.TEACHER && user.role !== UserRole.ORG_ADMIN && user.role !== UserRole.SUPER_ADMIN) {
    redirect('/')
  }

  return <TeacherSettingsView />
}

