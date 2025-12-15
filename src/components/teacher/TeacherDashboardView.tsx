'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Plus, FileText, Users } from 'lucide-react'
import { CourseSheet } from '@/components/teacher/CourseSheet'
import { useRouter } from 'next/navigation'

interface Course {
  id: string
  name: string
  description: string | null
  tests: Array<{
    id: string
    name: string
    _count: {
      submissions: number
    }
  }>
}

interface TeacherDashboardViewProps {
  initialCourses: Course[]
}

export function TeacherDashboardView({ initialCourses }: TeacherDashboardViewProps) {
  const router = useRouter()
  const [courses, setCourses] = useState(initialCourses)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const totalTests = courses.reduce((sum, course) => sum + course.tests.length, 0)
  const totalSubmissions = courses.reduce(
    (sum, course) => sum + course.tests.reduce((testSum, test) => testSum + test._count.submissions, 0),
    0
  )

  const handleCourseAdded = () => {
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Dashboard</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage your courses and tests
          </p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Course
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
            <BookOpen className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{courses.length}</div>
            <p className="text-xs text-zinc-500">Active courses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
            <FileText className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTests}</div>
            <p className="text-xs text-zinc-500">Tests created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <Users className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-zinc-500">Student submissions</p>
          </CardContent>
        </Card>
      </div>

      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold">No courses yet</h3>
            <p className="mb-4 text-center text-zinc-600 dark:text-zinc-400">
              Create your first course to get started
            </p>
            <Button onClick={() => setIsSheetOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <Link key={course.id} href={`/teacher/courses/${course.id}`}>
              <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>
                    {course.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm text-zinc-600 dark:text-zinc-400">
                    {course.tests.length} test{course.tests.length !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <CourseSheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        onSuccess={handleCourseAdded}
      />
    </div>
  )
}

