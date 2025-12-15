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
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { createCourse } from '@/actions/courses'
import { useRouter } from 'next/navigation'
import { BookOpen } from 'lucide-react'

interface CourseSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CourseSheet({ open, onOpenChange, onSuccess }: CourseSheetProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const course = await createCourse(formData)
      setFormData({ name: '', description: '' })
      onOpenChange(false)
      router.push(`/teacher/courses/${course.id}`)
      onSuccess?.()
    } catch (err: any) {
      setError(err.message || 'Failed to create course')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', description: '' })
      setError(null)
      onOpenChange(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleClose} side="left">
      <SheetContent onClose={handleClose}>
        <SheetHeader>
          <SheetClose onClose={handleClose} />
          <SheetTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Create New Course
          </SheetTitle>
          <SheetDescription>
            Add a new course to organize your tests
          </SheetDescription>
        </SheetHeader>

        <SheetBody>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Course Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Mathematics 101"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="description" className="text-sm font-medium">
                  Description (Optional)
                </label>
                <Textarea
                  id="description"
                  placeholder="Course description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={handleClose}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" className="flex-1" disabled={isLoading}>
                {isLoading ? 'Creating...' : 'Create Course'}
              </Button>
            </div>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

