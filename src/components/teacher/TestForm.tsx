'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { createTest } from '@/actions/tests'
import { Upload } from 'lucide-react'

interface TestFormProps {
  courseId: string
}

export function TestForm({ courseId }: TestFormProps) {
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
        router.push(`/teacher/tests/${result.test.id}`)
      } else {
        setError(result.error || 'Failed to create test')
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create test')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Details</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
              {error}
            </div>
          )}
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
            />
            {testPaperFile && (
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Selected: {testPaperFile.name}
              </p>
            )}
          </div>
          <div className="flex gap-4">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Creating...' : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Create Test
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

