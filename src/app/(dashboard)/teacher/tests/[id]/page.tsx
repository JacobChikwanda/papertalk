import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getTest } from '@/actions/tests'
import { UserRole } from '@prisma/client'
import { TestDetailHeader } from '@/components/teacher/TestDetailHeader'
import { SubmissionsTable } from '@/components/teacher/SubmissionsTable'

export default async function TestDetailPage({
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

  // Transform submissions for the table component
  const submissionsForTable = test.submissions.map((submission) => ({
    id: submission.id,
    studentName: submission.studentName,
    studentEmail: submission.studentEmail,
    status: submission.status,
    processingStatus: submission.processingStatus || 'pending',
    finalScore: submission.finalScore,
    createdAt: submission.createdAt,
  }))

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <TestDetailHeader
        testName={test.name}
        courseName={test.course.name}
        courseId={test.course.id}
        testId={id}
        testPaper={test.testPaper}
      />

      <div className="mb-4">
        <h2 className="text-lg font-semibold">Submissions ({test.submissions.length})</h2>
        {test.description && (
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
            {test.description}
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <SubmissionsTable testId={id} initialSubmissions={submissionsForTable} />
      </div>
    </div>
  )
}

