'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Card, CardContent } from '@/components/ui/card'
import { Upload, X, GripVertical } from 'lucide-react'
import { createTeacherSubmission } from '@/actions/teacher-submissions'
import { uploadImages } from '@/actions/upload-image'
import { useRouter } from 'next/navigation'

interface TeacherSubmissionSheetProps {
  testId: string
  testName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TeacherSubmissionSheet({
  testId,
  testName,
  open,
  onOpenChange,
}: TeacherSubmissionSheetProps) {
  const router = useRouter()
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [existingSubmission, setExistingSubmission] = useState<{ name: string; email: string } | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader()
        reader.onload = (e) => {
          const dataUrl = e.target?.result as string
          setImages((prev) => [...prev, dataUrl])
        }
        reader.readAsDataURL(file)
      }
    })
  }

  const handleRemoveImage = (index: number) => {
    setImages(images.filter((_, i) => i !== index))
  }

  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    setDragOverIndex(index)
  }

  const handleDragLeave = () => {
    setDragOverIndex(null)
  }

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    setDragOverIndex(null)

    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null)
      return
    }

    const newImages = [...images]
    const draggedImage = newImages[draggedIndex]
    newImages.splice(draggedIndex, 1)
    newImages.splice(dropIndex, 0, draggedImage)
    setImages(newImages)
    setDraggedIndex(null)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
    setDragOverIndex(null)
  }

  const handleSubmit = async () => {
    if (!studentName || !studentEmail || images.length === 0) {
      alert('Please fill in student details and upload at least one image')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload images using server action (bypasses RLS)
      const uploadResult = await uploadImages(images)
      
      if (!uploadResult.success || !uploadResult.urls) {
        throw new Error(uploadResult.error || 'Failed to upload images')
      }

      // Create teacher submission (no magic link needed)
      const result = await createTeacherSubmission({
        testId,
        studentName,
        studentEmail,
        imageUrls: uploadResult.urls,
      })

      if (result.success) {
        const message = (result as any).updated
          ? 'Submission updated successfully!'
          : 'Submission added successfully!'
        alert(message)
        onOpenChange(false)
        setStudentName('')
        setStudentEmail('')
        setImages([])
        setExistingSubmission(null)
        router.refresh()
      } else {
        alert(result.error || 'Failed to submit')
      }
    } catch (error) {
      console.error('Error submitting:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} side="left">
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-0">
        <SheetHeader>
          <SheetTitle>Add Student Submission</SheetTitle>
          <SheetDescription>
            Upload images for a student submission to {testName}. You can add or update submissions on behalf of students.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="teacher-student-name" className="text-sm font-medium">
              Student Name
            </label>
            <input
              id="teacher-student-name"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="John Doe"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="teacher-student-email" className="text-sm font-medium">
              Student Email
            </label>
            <input
              id="teacher-student-email"
              type="email"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="john@example.com"
              value={studentEmail}
              onChange={(e) => {
                setStudentEmail(e.target.value)
                setExistingSubmission(null) // Clear existing submission check when email changes
              }}
              required
            />
            {existingSubmission && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/20 dark:text-amber-200">
                <p className="font-medium">Existing submission found</p>
                <p className="text-xs mt-1">
                  A submission already exists for {existingSubmission.email}. Adding a new submission will update the existing one.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Upload Images</label>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileUpload}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm file:border-0 file:bg-transparent"
            />
            <p className="text-xs text-zinc-600 dark:text-zinc-400">
              You can upload multiple images. Drag and drop to reorder them.
            </p>
          </div>

          {images.length > 0 && (
            <Card>
              <CardContent className="pt-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {images.map((image, index) => (
                    <div
                      key={index}
                      draggable
                      onDragStart={() => handleDragStart(index)}
                      onDragOver={(e) => handleDragOver(e, index)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, index)}
                      onDragEnd={handleDragEnd}
                      className={`relative group cursor-move transition-all ${
                        draggedIndex === index ? 'opacity-50 scale-95' : ''
                      } ${
                        dragOverIndex === index && draggedIndex !== index
                          ? 'ring-2 ring-blue-500 scale-105'
                          : ''
                      }`}
                    >
                      <div className="absolute left-2 top-2 z-10 bg-white/90 dark:bg-zinc-800/90 rounded p-1.5 shadow-sm">
                        <GripVertical className="h-4 w-4 text-zinc-600 dark:text-zinc-400" />
                      </div>
                      <div className="absolute left-2 bottom-2 z-10 bg-white/90 dark:bg-zinc-800/90 px-2 py-1 rounded text-xs font-medium">
                        #{index + 1}
                      </div>
                      <img
                        src={image}
                        alt={`Image ${index + 1}`}
                        className="h-48 w-full rounded-lg object-cover pointer-events-none"
                      />
                      <Button
                        variant="destructive"
                        size="icon"
                        className="absolute right-2 top-2 h-8 w-8 z-10"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRemoveImage(index)
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || images.length === 0}>
              {isSubmitting ? 'Submitting...' : existingSubmission ? 'Update Submission' : 'Add Submission'}
            </Button>
          </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}

