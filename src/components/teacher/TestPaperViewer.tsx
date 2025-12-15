'use client'

import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogClose,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { FileText, ExternalLink, Download } from 'lucide-react'

interface TestPaperViewerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fileName: string
  fileUrl: string
}

export function TestPaperViewer({
  open,
  onOpenChange,
  fileName,
  fileUrl,
}: TestPaperViewerProps) {
  const isPdf = fileName.toLowerCase().endsWith('.pdf')
  const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

  const handleDownload = () => {
    const link = document.createElement('a')
    link.href = fileUrl
    link.download = fileName
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleOpenInNewTab = () => {
    window.open(fileUrl, '_blank', 'noopener,noreferrer')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent onClose={() => onOpenChange(false)}>
        <DialogHeader>
          <DialogClose onClose={() => onOpenChange(false)} />
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {fileName}
          </DialogTitle>
          <DialogDescription>
            Test paper document
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
          <div className="space-y-4">
            {/* Action buttons */}
            <div className="flex gap-3">
              <Button onClick={handleDownload} variant="outline" className="flex-1">
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>
              <Button onClick={handleOpenInNewTab} variant="outline" className="flex-1">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open in New Tab
              </Button>
            </div>

            {/* Viewer */}
            <div className="border rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900">
              {isPdf ? (
                <iframe
                  src={fileUrl}
                  className="w-full h-[70vh] border-0"
                  title={fileName}
                />
              ) : isImage ? (
                <div className="flex items-center justify-center p-4">
                  <img
                    src={fileUrl}
                    alt={fileName}
                    className="max-w-full max-h-[70vh] object-contain rounded"
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                  <FileText className="h-12 w-12 text-zinc-400 mb-4" />
                  <p className="text-zinc-600 dark:text-zinc-400 mb-4">
                    Preview not available for this file type
                  </p>
                  <Button onClick={handleOpenInNewTab} variant="outline">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open in New Tab
                  </Button>
                </div>
              )}
            </div>
          </div>
        </DialogBody>
      </DialogContent>
    </Dialog>
  )
}

