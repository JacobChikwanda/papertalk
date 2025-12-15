'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetBody,
  SheetClose,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  User,
  Mail,
  Calendar,
  BookOpen,
  FileText,
  Ban,
  CheckCircle,
  Trash2,
} from 'lucide-react'
import { toggleTeacherStatus, deleteTeacher } from '@/actions/teachers'
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

interface TeacherDetailsSheetProps {
  teacher: Teacher | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdate?: () => void
}

export function TeacherDetailsSheet({
  teacher,
  open,
  onOpenChange,
  onUpdate,
}: TeacherDetailsSheetProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!teacher) return null

  const handleToggleStatus = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const result = await toggleTeacherStatus(teacher.id, !teacher.disabled)
      if (result.success) {
        router.refresh()
        onUpdate?.()
      } else {
        setError(result.error || 'Failed to update teacher status')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to delete ${teacher.name}? This action cannot be undone.`)) {
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await deleteTeacher(teacher.id)
      if (result.success) {
        onOpenChange(false)
        router.refresh()
        onUpdate?.()
      } else {
        setError(result.error || 'Failed to delete teacher')
      }
    } catch (err) {
      setError('An error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="left">
      <SheetContent onClose={() => onOpenChange(false)}>
        <SheetHeader>
          <SheetClose onClose={() => onOpenChange(false)} />
          <SheetTitle>Teacher Details</SheetTitle>
          <SheetDescription>
            View and manage teacher information
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}

          <div className="space-y-6">
            {/* Status Badge */}
            <div className="flex items-center justify-between">
              <Badge variant={teacher.disabled ? 'secondary' : 'default'}>
                {teacher.disabled ? 'Disabled' : 'Active'}
              </Badge>
            </div>

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Basic Information
              </h3>
              
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <User className="mt-0.5 h-5 w-5 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium">Name</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{teacher.name}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Mail className="mt-0.5 h-5 w-5 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">{teacher.email}</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-5 w-5 text-zinc-500" />
                  <div>
                    <p className="text-sm font-medium">Joined</p>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      {new Date(teacher.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Statistics */}
            {teacher._count && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                  Statistics
                </h3>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <BookOpen className="h-4 w-4" />
                      <span className="text-xs font-medium">Courses</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold">{teacher._count.courses || 0}</p>
                  </div>

                  <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                    <div className="flex items-center gap-2 text-zinc-500">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs font-medium">Tests</span>
                    </div>
                    <p className="mt-1 text-2xl font-bold">{teacher._count.tests || 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="space-y-4 border-t border-zinc-200 pt-6 dark:border-zinc-800">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                Actions
              </h3>
              
              <div className="space-y-2">
                <Button
                  variant={teacher.disabled ? 'default' : 'outline'}
                  className="w-full"
                  onClick={handleToggleStatus}
                  disabled={isLoading}
                >
                  {teacher.disabled ? (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Enable Teacher
                    </>
                  ) : (
                    <>
                      <Ban className="mr-2 h-4 w-4" />
                      Disable Teacher
                    </>
                  )}
                </Button>

                <Button
                  variant="destructive"
                  className="w-full"
                  onClick={handleDelete}
                  disabled={isLoading}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Teacher
                </Button>
              </div>
            </div>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

