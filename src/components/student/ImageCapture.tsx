'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { WebcamCapture } from './WebcamCapture'
import { MobileCameraCapture } from './MobileCameraCapture'
import { FileUploadCapture } from './FileUploadCapture'
import { batchManager } from '@/lib/submission-batch'
import { syncService } from '@/lib/submission-sync'
import { uploadImages } from '@/actions/upload-image'
import { Camera, Upload, Smartphone, Cloud, CheckCircle2, AlertCircle, GripVertical, X } from 'lucide-react'

interface ImageCaptureProps {
  magicLinkToken: string
  testId: string
}

export function ImageCapture({ magicLinkToken, testId }: ImageCaptureProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [studentName, setStudentName] = useState('')
  const [studentEmail, setStudentEmail] = useState('')
  const [images, setImages] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState('webcam')
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  // Update pending count periodically
  useEffect(() => {
    const updatePendingCount = () => {
      setPendingCount(batchManager.getPendingCount())
    }

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 2000) // Check every 2 seconds

    return () => clearInterval(interval)
  }, [])

  const handleImageCapture = (imageDataUrl: string) => {
    setImages([...images, imageDataUrl])
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
      alert('Please fill in your details and capture at least one image')
      return
    }

    setIsSubmitting(true)

    try {
      // Upload images using server action (bypasses RLS)
      const uploadResult = await uploadImages(images)
      
      if (!uploadResult.success || !uploadResult.urls) {
        throw new Error(uploadResult.error || 'Failed to upload images')
      }

      // Store submission locally (batching)
      const pendingSubmission = batchManager.addSubmission({
        studentName,
        studentEmail,
        imageUrls: uploadResult.urls,
        magicLinkToken,
      })

      // Update pending count
      setPendingCount(batchManager.getPendingCount())

      // Trigger sync if batch threshold reached
      if (batchManager.shouldSync()) {
        setIsSyncing(true)
        try {
          await syncService.forceSync()
        } catch (error) {
          console.error('Error syncing:', error)
        } finally {
          setIsSyncing(false)
          setPendingCount(batchManager.getPendingCount())
        }
      }

      // Show success immediately (submission stored locally)
      router.push(`/submit/${magicLinkToken}/success`)
    } catch (error) {
      console.error('Error submitting exam:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleManualSync = async () => {
    setIsSyncing(true)
    try {
      await syncService.forceSync()
      setPendingCount(batchManager.getPendingCount())
    } catch (error) {
      console.error('Error syncing:', error)
      alert('Failed to sync. Will retry automatically.')
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Student Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="name" className="text-sm font-medium">
              Your Name
            </label>
            <input
              id="name"
              type="text"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="John Doe"
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium">
              Your Email
            </label>
            <input
              id="email"
              type="email"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              placeholder="john@example.com"
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              required
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Capture Exam Images</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="webcam">
                <Camera className="mr-2 h-4 w-4" />
                Webcam
              </TabsTrigger>
              <TabsTrigger value="mobile">
                <Smartphone className="mr-2 h-4 w-4" />
                Mobile
              </TabsTrigger>
              <TabsTrigger value="upload">
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </TabsTrigger>
            </TabsList>
            <TabsContent value="webcam" className="mt-4">
              <WebcamCapture onCapture={handleImageCapture} />
            </TabsContent>
            <TabsContent value="mobile" className="mt-4">
              <MobileCameraCapture onCapture={handleImageCapture} />
            </TabsContent>
            <TabsContent value="upload" className="mt-4">
              <FileUploadCapture onCapture={handleImageCapture} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Captured Images ({images.length})</CardTitle>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Drag and drop images to reorder them. Images will be processed in order.
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
                    alt={`Capture ${index + 1}`}
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

      {/* Pending Sync Indicator */}
      {pendingCount > 0 && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
          <CardContent className="flex items-center justify-between pt-6">
            <div className="flex items-center gap-3">
              {isSyncing ? (
                <>
                  <Cloud className="h-5 w-5 animate-pulse text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      Syncing submissions...
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      {pendingCount} submission{pendingCount !== 1 ? 's' : ''} pending
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="font-medium text-blue-900 dark:text-blue-100">
                      {pendingCount} submission{pendingCount !== 1 ? 's' : ''} pending sync
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300">
                      Will sync automatically when batch is ready
                    </p>
                  </div>
                </>
              )}
            </div>
            <Button
              onClick={handleManualSync}
              disabled={isSyncing || pendingCount === 0}
              variant="outline"
              size="sm"
            >
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={isSubmitting || images.length === 0}
          size="lg"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Exam'}
        </Button>
      </div>
    </div>
  )
}

