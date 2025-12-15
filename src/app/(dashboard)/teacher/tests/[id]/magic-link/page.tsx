import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getTest } from '@/actions/tests'
import { MagicLinkDisplay } from '@/components/teacher/MagicLinkDisplay'
import { UserRole } from '@prisma/client'
import Link from 'next/link'

export default async function MagicLinkPage({
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

  const test = await getTest(id)

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8">
        <Link href={`/teacher/tests/${id}`} className="text-zinc-600 hover:underline dark:text-zinc-400">
          ← Back to Test
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Generate Magic Link</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Create a one-time use link for students to submit their exam
        </p>
      </div>

      <MagicLinkDisplay testId={id} testName={test.name} />
    </div>
  )
}

