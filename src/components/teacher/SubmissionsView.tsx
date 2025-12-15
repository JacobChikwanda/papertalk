'use client'

import { useState, useMemo } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import Link from 'next/link'
import {
  GraduationCap,
  FileText,
  BookOpen,
  Search,
  Clock,
  CheckCircle2,
  Filter,
  X,
} from 'lucide-react'

interface Submission {
  id: string
  studentName: string
  studentEmail: string
  status: string
  finalScore: number | null
  createdAt: Date
  test: {
    id: string
    name: string
    course: {
      id: string
      name: string
    }
  }
}

interface Course {
  id: string
  name: string
  description: string | null
}

interface SubmissionsViewProps {
  initialSubmissions: Submission[]
  courses: Course[]
}

type StatusFilter = 'all' | 'pending' | 'graded'

export function SubmissionsView({ initialSubmissions, courses }: SubmissionsViewProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all')

  // Update selectedCourseId when tabs change
  const handleTabChange = (value: string) => {
    setSelectedCourseId(value === 'all' ? 'all' : value)
  }

  // Group submissions by course
  const submissionsByCourse = useMemo(() => {
    const grouped: Record<string, Submission[]> = {}
    initialSubmissions.forEach((submission) => {
      const courseId = submission.test.course.id
      if (!grouped[courseId]) {
        grouped[courseId] = []
      }
      grouped[courseId].push(submission)
    })
    return grouped
  }, [initialSubmissions])

  // Get filtered submissions (without course filter - that's handled by tabs)
  const getFilteredSubmissions = (submissions: Submission[]) => {
    let filtered = submissions

    // Filter by status
    if (statusFilter === 'pending') {
      filtered = filtered.filter((s) => s.status !== 'graded')
    } else if (statusFilter === 'graded') {
      filtered = filtered.filter((s) => s.status === 'graded')
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          s.studentName.toLowerCase().includes(query) ||
          s.studentEmail.toLowerCase().includes(query) ||
          s.test.name.toLowerCase().includes(query) ||
          s.test.course.name.toLowerCase().includes(query)
      )
    }

    return filtered
  }

  // Get all filtered submissions for stats
  const filteredSubmissions = useMemo(() => {
    return getFilteredSubmissions(initialSubmissions)
  }, [initialSubmissions, statusFilter, searchQuery])

  // Calculate stats
  const stats = useMemo(() => {
    const total = initialSubmissions.length
    const pending = initialSubmissions.filter((s) => s.status !== 'graded').length
    const graded = initialSubmissions.filter((s) => s.status === 'graded').length

    return { total, pending, graded }
  }, [initialSubmissions])

  // Get course stats
  const courseStats = useMemo(() => {
    const stats: Record<string, { total: number; pending: number; graded: number }> = {}
    
    Object.entries(submissionsByCourse).forEach(([courseId, submissions]) => {
      stats[courseId] = {
        total: submissions.length,
        pending: submissions.filter((s) => s.status !== 'graded').length,
        graded: submissions.filter((s) => s.status === 'graded').length,
      }
    })

    return stats
  }, [submissionsByCourse])

  const clearFilters = () => {
    setSearchQuery('')
    setStatusFilter('all')
    setSelectedCourseId('all')
  }

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all'

  return (
    <div className="mx-auto max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight">Student Submissions</h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          Review and grade student exam submissions
        </p>
      </div>

      {/* Stats Cards */}
      <div className="mb-6 grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Submissions</CardTitle>
            <GraduationCap className="h-4 w-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-zinc-500">All submissions</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Pending Review</CardTitle>
            <Clock className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.pending}</div>
            <p className="text-xs text-zinc-500">Need grading</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Graded</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.graded}</div>
            <p className="text-xs text-zinc-500">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filter Submissions
            </CardTitle>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <Input
                placeholder="Search by student name, email, test, or course..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <div>
              <label className="mb-2 block text-sm font-medium">Filter by Status</label>
              <div className="flex gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('all')}
                  className="flex-1"
                >
                  All ({stats.total})
                </Button>
                <Button
                  variant={statusFilter === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('pending')}
                  className="flex-1"
                >
                  <Clock className="mr-2 h-4 w-4" />
                  Pending ({stats.pending})
                </Button>
                <Button
                  variant={statusFilter === 'graded' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStatusFilter('graded')}
                  className="flex-1"
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Graded ({stats.graded})
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submissions by Course */}
      {courses.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold">No courses yet</h3>
            <p className="mb-4 text-center text-zinc-600 dark:text-zinc-400">
              Create a course to start receiving submissions
            </p>
          </CardContent>
        </Card>
      ) : filteredSubmissions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Search className="mb-4 h-12 w-12 text-zinc-400" />
            <h3 className="mb-2 text-lg font-semibold">No submissions found</h3>
            <p className="mb-4 text-center text-zinc-600 dark:text-zinc-400">
              {hasActiveFilters
                ? 'Try adjusting your filters'
                : 'Student submissions will appear here once they submit their exams'}
            </p>
            {hasActiveFilters && (
              <Button onClick={clearFilters} variant="outline">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Tabs
          value={selectedCourseId === 'all' ? 'all' : selectedCourseId}
          onValueChange={handleTabChange}
          className="space-y-4"
        >
          <TabsList className="flex w-full flex-wrap gap-2 h-auto p-1">
            <TabsTrigger value="all" className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800">
              All Courses
              <Badge variant="secondary" className="ml-2">
                {stats.total}
              </Badge>
            </TabsTrigger>
            {courses.map((course) => {
              const courseStat = courseStats[course.id] || { total: 0, pending: 0, graded: 0 }
              return (
                <TabsTrigger
                  key={course.id}
                  value={course.id}
                  className="data-[state=active]:bg-zinc-100 dark:data-[state=active]:bg-zinc-800"
                >
                  {course.name}
                  {courseStat.pending > 0 && (
                    <Badge variant="destructive" className="ml-2">
                      {courseStat.pending}
                    </Badge>
                  )}
                </TabsTrigger>
              )
            })}
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <SubmissionsTable submissions={filteredSubmissions} />
          </TabsContent>

          {courses.map((course) => {
            const courseSubmissions = initialSubmissions.filter(
              (s) => s.test.course.id === course.id
            )
            const filteredCourseSubmissions = getFilteredSubmissions(courseSubmissions)
            return (
              <TabsContent key={course.id} value={course.id} className="space-y-4">
                {filteredCourseSubmissions.length === 0 ? (
                  <Card>
                    <CardContent className="py-8 text-center">
                      <p className="text-zinc-600 dark:text-zinc-400">
                        {courseSubmissions.length === 0
                          ? 'No submissions for this course'
                          : 'No submissions match your filters'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <SubmissionsTable submissions={filteredCourseSubmissions} />
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      )}
    </div>
  )
}

function SubmissionsTable({ submissions }: { submissions: Submission[] }) {
  // Sort: pending first, then by date
  const sortedSubmissions = [...submissions].sort((a, b) => {
    if (a.status !== 'graded' && b.status === 'graded') return -1
    if (a.status === 'graded' && b.status !== 'graded') return 1
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {submissions.length} Submission{submissions.length !== 1 ? 's' : ''}
        </CardTitle>
        <CardDescription>
          {submissions.filter((s) => s.status !== 'graded').length} pending review
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Test</TableHead>
              <TableHead>Course</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Score</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedSubmissions.map((submission) => (
              <TableRow
                key={submission.id}
                className={submission.status !== 'graded' ? 'bg-orange-50/50 dark:bg-orange-950/10' : ''}
              >
                <TableCell>
                  <div>
                    <div className="font-medium">{submission.studentName}</div>
                    <div className="text-sm text-zinc-500">{submission.studentEmail}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-zinc-500" />
                    {submission.test.name}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-zinc-500" />
                    {submission.test.course.name}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge
                    variant={submission.status === 'graded' ? 'default' : 'destructive'}
                    className={
                      submission.status !== 'graded'
                        ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                        : ''
                    }
                  >
                    {submission.status === 'graded' ? (
                      <>
                        <CheckCircle2 className="mr-1 h-3 w-3" />
                        Graded
                      </>
                    ) : (
                      <>
                        <Clock className="mr-1 h-3 w-3" />
                        Pending
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {submission.finalScore !== null ? (
                    <span className="text-lg">{submission.finalScore}/100</span>
                  ) : (
                    <span className="text-zinc-400">-</span>
                  )}
                </TableCell>
                <TableCell>
                  {new Date(submission.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  })}
                </TableCell>
                <TableCell className="text-right">
                  <Link href={`/grade/${submission.id}`}>
                    <Button
                      variant={submission.status !== 'graded' ? 'default' : 'outline'}
                      size="sm"
                      className={
                        submission.status !== 'graded'
                          ? 'bg-orange-600 hover:bg-orange-700'
                          : ''
                      }
                    >
                      {submission.status === 'graded' ? 'View' : 'Grade Now'}
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

