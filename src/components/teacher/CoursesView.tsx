'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { BookOpen, Plus, FileText } from 'lucide-react'
import { CourseSheet } from '@/components/teacher/CourseSheet'
import { useRouter } from 'next/navigation'

interface Course {
  id: string
  name: string
  description: string | null
  createdAt: Date
  tests: Array<{
    id: string
    name: string
    createdAt: Date
    _count: {
      submissions: number
    }
  }>
}

interface CoursesViewProps {
  initialCourses: Course[]
}

export function CoursesView({ initialCourses }: CoursesViewProps) {
  const router = useRouter()
  const [courses, setCourses] = useState(initialCourses)
  const [isSheetOpen, setIsSheetOpen] = useState(false)

  const handleCourseAdded = () => {
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Courses</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage your courses and their tests
          </p>
        </div>
        <Button onClick={() => setIsSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Course
        </Button>
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
              <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
                <CardHeader>
                  <CardTitle>{course.name}</CardTitle>
                  <CardDescription>
                    {course.description || 'No description'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
                    <div className="flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      <span>{course.tests.length} test{course.tests.length !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-zinc-500">
                    Created {new Date(course.createdAt).toLocaleDateString()}
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

