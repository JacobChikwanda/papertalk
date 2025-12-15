'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Upload } from 'lucide-react'

interface FileUploadCaptureProps {
  onCapture: (imageDataUrl: string) => void
}

export function FileUploadCapture({ onCapture }: FileUploadCaptureProps) {
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files) {
      Array.from(files).forEach((file) => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader()
          reader.onloadend = () => {
            const result = reader.result as string
            if (!preview) {
              setPreview(result)
            }
            onCapture(result)
          }
          reader.readAsDataURL(file)
        }
      })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>
      {preview && (
        <div className="rounded-lg border p-2">
          <img
            src={preview}
            alt="Preview"
            className="h-48 w-full rounded object-cover"
          />
        </div>
      )}
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        Select one or more image files from your device.
      </p>
    </div>
  )
}

