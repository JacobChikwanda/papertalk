'use client'

import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Camera } from 'lucide-react'

interface MobileCameraCaptureProps {
  onCapture: (imageDataUrl: string) => void
}

export function MobileCameraCapture({ onCapture }: MobileCameraCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        const result = reader.result as string
        setPreview(result)
        onCapture(result)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleCapture = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleFileChange}
        className="hidden"
      />
      <Button onClick={handleCapture} className="w-full">
        <Camera className="mr-2 h-4 w-4" />
        Open Camera
      </Button>
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
        On mobile devices, this will open your camera app to take a photo.
      </p>
    </div>
  )
}

