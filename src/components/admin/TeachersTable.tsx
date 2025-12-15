'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AddTeacherSheet } from '@/components/admin/AddTeacherSheet'
import { TeacherDetailsSheet } from '@/components/admin/TeacherDetailsSheet'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Users, Plus, MoreVertical } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface Teacher {
  id: string
  name: string
  email: string
  createdAt: Date
  disabled: boolean
  _count?: {
    courses: number
    tests: number
  }
}

interface TeachersTableProps {
  initialTeachers: Teacher[]
}

export function TeachersTable({ initialTeachers }: TeachersTableProps) {
  const router = useRouter()
  const [teachers, setTeachers] = useState(initialTeachers)
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null)
  const [isDetailsSheetOpen, setIsDetailsSheetOpen] = useState(false)
  const [isAddSheetOpen, setIsAddSheetOpen] = useState(false)

  // Sync state with props when they change (after router.refresh())
  useEffect(() => {
    setTeachers(initialTeachers)
  }, [initialTeachers])

  const handleRowClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher)
    setIsDetailsSheetOpen(true)
  }

  const handleTeacherAdded = () => {
    // Just refresh the page - the server component will re-fetch the data
    router.refresh()
  }

  const handleTeacherUpdate = () => {
    // Just refresh the page - the server component will re-fetch the data
    router.refresh()
  }

  return (
    <div className="mx-auto max-w-7xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teachers</h1>
          <p className="mt-2 text-zinc-600 dark:text-zinc-400">
            Manage teachers in your organization
          </p>
        </div>
        <Button onClick={() => setIsAddSheetOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Teacher
        </Button>
      </div>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>
            {teachers.length} teacher{teachers.length !== 1 ? 's' : ''} in your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="py-12 text-center">
              <Users className="mx-auto mb-4 h-12 w-12 text-zinc-400" />
              <h3 className="mb-2 text-lg font-semibold">No teachers yet</h3>
              <p className="text-zinc-600 dark:text-zinc-400">
                Add your first teacher using the form above
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Courses</TableHead>
                  <TableHead>Tests</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers.map((teacher) => (
                  <TableRow
                    key={teacher.id}
                    className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-900"
                    onClick={() => handleRowClick(teacher)}
                  >
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      <Badge variant={teacher.disabled ? 'secondary' : 'default'}>
                        {teacher.disabled ? 'Disabled' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>{teacher._count?.courses || 0}</TableCell>
                    <TableCell>{teacher._count?.tests || 0}</TableCell>
                    <TableCell>
                      {new Date(teacher.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRowClick(teacher)
                        }}
                      >
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add Teacher Sheet */}
      <AddTeacherSheet
        open={isAddSheetOpen}
        onOpenChange={setIsAddSheetOpen}
        onSuccess={handleTeacherAdded}
      />

      {/* Teacher Details Sheet */}
      <TeacherDetailsSheet
        teacher={selectedTeacher}
        open={isDetailsSheetOpen}
        onOpenChange={setIsDetailsSheetOpen}
        onUpdate={handleTeacherUpdate}
      />
    </div>
  )
}

