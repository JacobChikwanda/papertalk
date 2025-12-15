import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TestForm } from '@/components/teacher/TestForm'
import { UserRole } from '@prisma/client'

export default async function NewTestPage({
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

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">Create New Test</h1>
      <TestForm courseId={id} />
    </div>
  )
}

