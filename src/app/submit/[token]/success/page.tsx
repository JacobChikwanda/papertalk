'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckCircle2, Cloud, AlertCircle } from 'lucide-react'
import { batchManager } from '@/lib/submission-batch'
import { syncService } from '@/lib/submission-sync'

export default function SubmitSuccessPage() {
  const [pendingCount, setPendingCount] = useState(0)
  const [isSyncing, setIsSyncing] = useState(false)

  useEffect(() => {
    const updatePendingCount = () => {
      setPendingCount(batchManager.getPendingCount())
    }

    updatePendingCount()
    const interval = setInterval(updatePendingCount, 2000)

    // Try to sync immediately
    syncService.forceSync().catch(console.error)

    return () => clearInterval(interval)
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    try {
      await syncService.forceSync()
      setPendingCount(batchManager.getPendingCount())
    } catch (error) {
      console.error('Error syncing:', error)
    } finally {
      setIsSyncing(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-green-500" />
          <CardTitle className="text-2xl">Submission Successful!</CardTitle>
          <CardDescription>
            Your exam has been submitted successfully.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Your teacher will review and grade your submission. You will be
            notified once grading is complete.
          </p>

          {pendingCount > 0 && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/20">
              <div className="flex items-center justify-center gap-2">
                {isSyncing ? (
                  <>
                    <Cloud className="h-4 w-4 animate-pulse text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-900 dark:text-blue-100">
                      Syncing to server...
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm text-blue-900 dark:text-blue-100">
                      {pendingCount} submission{pendingCount !== 1 ? 's' : ''} pending sync
                    </span>
                  </>
                )}
              </div>
              {!isSyncing && (
                <button
                  onClick={handleSync}
                  className="mt-2 text-xs text-blue-700 underline hover:text-blue-900 dark:text-blue-300 dark:hover:text-blue-100"
                >
                  Sync now
                </button>
              )}
            </div>
          )}

          {pendingCount === 0 && (
            <Badge variant="default" className="bg-green-600">
              <CheckCircle2 className="mr-1 h-3 w-3" />
              All submissions synced
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

