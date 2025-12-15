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
import { createTest } from '@/actions/tests'
import { useRouter } from 'next/navigation'
import { FileText, Upload } from 'lucide-react'

interface TestSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  courseId: string
  courseName?: string
  onSuccess?: () => void
}

export function TestSheet({
  open,
  onOpenChange,
  courseId,
  courseName,
  onSuccess,
}: TestSheetProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [testPaperFile, setTestPaperFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setTestPaperFile(e.target.files[0])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    if (!testPaperFile) {
      setError('Please upload a test paper')
      setIsLoading(false)
      return
    }

    try {
      const result = await createTest({
        ...formData,
        courseId,
        testPaperFile,
      })

      if (result.success && result.test) {
        setFormData({ name: '', description: '' })
        setTestPaperFile(null)
        onOpenChange(false)
        router.push(`/teacher/tests/${result.test.id}`)
        onSuccess?.()
      } else {
        setError(result.error || 'Failed to create test')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create test')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    if (!isLoading) {
      setFormData({ name: '', description: '' })
      setTestPaperFile(null)
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
            <FileText className="h-5 w-5" />
            Create New Test
          </SheetTitle>
          <SheetDescription>
            {courseName ? `Add a test to ${courseName}` : 'Add a new test to your course'}
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
                  Test Name
                </label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Midterm Exam"
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
                  placeholder="Test description..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="testPaper" className="text-sm font-medium">
                  Test Paper (Required)
                </label>
                <Input
                  id="testPaper"
                  type="file"
                  accept=".pdf,image/*"
                  onChange={handleFileChange}
                  required
                  disabled={isLoading}
                />
                {testPaperFile && (
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Selected: {testPaperFile.name}
                  </p>
                )}
                <p className="text-xs text-zinc-500">
                  Upload a PDF or image file of the test paper
                </p>
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
                {isLoading ? (
                  'Creating...'
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Create Test
                  </>
                )}
              </Button>
            </div>
          </form>
        </SheetBody>
      </SheetContent>
    </Sheet>
  )
}

