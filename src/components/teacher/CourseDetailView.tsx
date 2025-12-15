'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Plus, FileText } from 'lucide-react'
import { TestSheet } from '@/components/teacher/TestSheet'
import { useRouter } from 'next/navigation'

interface Course {
  id: string
  name: string
  description: string | null
  tests: Array<{
    id: string
    name: string
    createdAt: Date
    _count: {
      submissions: number
    }
  }>
}

interface CourseDetailViewProps {
  course: Course
}

export function CourseDetailView({ course }: CourseDetailViewProps) {
  const router = useRouter()
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleTestAdded = () => {
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8">
        <Link href="/teacher/courses" className="text-zinc-600 hover:underline dark:text-zinc-400">
          ← Back to Courses
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">{course.name}</h1>
        {course.description && (
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            {course.description}
          </p>
        )}
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Tests</h2>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Test
        </Button>
      </div>

      {course.tests.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold">No tests yet</h3>
            <p className="mb-4 text-center text-zinc-600 dark:text-zinc-400">
              Create your first test for this course
            </p>
            <Button onClick={() => setIsSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {course.tests.map((test) => (
            <Link key={test.id} href={`/teacher/tests/${test.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>{test.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {test._count.submissions} submission{test._count.submissions !== 1 ? 's' : ''}
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Created {new Date(test.createdAt).toLocaleDateString()}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <TestSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        courseId={course.id}
        courseName={course.name}
        onSuccess={handleTestAdded}
      />
    </div>
  )
}

