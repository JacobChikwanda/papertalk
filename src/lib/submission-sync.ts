// Submission sync service with retry logic and error handling
// Handles syncing local submissions to server in batches

import { batchManager, PendingSubmission } from './submission-batch'

interface BulkSubmissionResult {
  localId: string
  success: boolean
  serverId?: string
  error?: string
}

class SubmissionSyncService {
  private isSyncing = false
  private retryAttempts = new Map<string, number>()
  private maxRetries = 3
  private retryDelay = 1000 // Start with 1 second

  async syncPending(): Promise<void> {
    if (this.isSyncing) {
      return // Already syncing
    }

    const pending = batchManager.getPendingSubmissionsForSync()
    if (pending.length === 0) {
      return
    }

    // Only sync if we have a batch or there are errors to retry
    const shouldSync = batchManager.shouldSync() || pending.some((s) => s.syncStatus === 'error')
    
    if (!shouldSync && pending.length < parseInt(process.env.NEXT_PUBLIC_SUBMISSION_BATCH_SIZE || '5')) {
      return // Wait for more submissions
    }

    this.isSyncing = true

    try {
      // Get batch to sync (up to batch size)
      const batchToSync = pending.slice(0, parseInt(process.env.NEXT_PUBLIC_SUBMISSION_BATCH_SIZE || '5'))
      const localIds = batchToSync.map((s) => s.id)

      // Mark as syncing
      batchManager.markAsSyncing(localIds)

      // Call bulk submission API
      const response = await fetch('/api/submissions/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          submissions: batchToSync.map((s) => ({
            studentName: s.studentName,
            studentEmail: s.studentEmail,
            imageUrls: s.imageUrls,
            magicLinkToken: s.magicLinkToken,
          })),
          localIds, // Include local IDs for mapping
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        throw new Error(error || 'Failed to sync submissions')
      }

      const results: BulkSubmissionResult[] = await response.json()

      // Process results
      for (const result of results) {
        if (result.success && result.serverId) {
          batchManager.markAsSynced(result.localId, result.serverId)
          this.retryAttempts.delete(result.localId)
        } else {
          const attempt = this.retryAttempts.get(result.localId) || 0
          if (attempt < this.maxRetries) {
            this.retryAttempts.set(result.localId, attempt + 1)
            batchManager.markAsError(result.localId, result.error || 'Sync failed')
          } else {
            // Max retries reached, mark as error permanently
            batchManager.markAsError(result.localId, result.error || 'Max retries reached')
          }
        }
      }

      // Clean up synced items periodically
      batchManager.removeSynced()
    } catch (error: any) {
      console.error('Error syncing submissions:', error)
      // Mark all as error for retry
      const batchToSync = pending.slice(0, parseInt(process.env.NEXT_PUBLIC_SUBMISSION_BATCH_SIZE || '5'))
      batchToSync.forEach((submission) => {
        const attempt = this.retryAttempts.get(submission.id) || 0
        if (attempt < this.maxRetries) {
          this.retryAttempts.set(submission.id, attempt + 1)
          batchManager.markAsError(submission.id, error.message || 'Sync failed')
        }
      })
    } finally {
      this.isSyncing = false
    }
  }

  async syncWithRetry(): Promise<void> {
    // Retry failed submissions with exponential backoff
    const pending = batchManager.getPendingSubmissionsForSync()
    const errors = pending.filter((s) => s.syncStatus === 'error')

    for (const submission of errors) {
      const attempt = this.retryAttempts.get(submission.id) || 0
      if (attempt < this.maxRetries) {
        const delay = this.retryDelay * Math.pow(2, attempt) // Exponential backoff
        setTimeout(() => {
          this.syncPending()
        }, delay)
      }
    }
  }

  // Manual sync trigger
  async forceSync(): Promise<void> {
    await this.syncPending()
  }

  // Initialize background sync
  init() {
    if (typeof window === 'undefined') return

    // Sync on page load
    this.syncPending()

    // Sync periodically (every 30 seconds)
    setInterval(() => {
      this.syncPending()
    }, 30000)

    // Sync when page becomes visible (user comes back to tab)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.syncPending()
      }
    })

    // Sync when online (if was offline)
    window.addEventListener('online', () => {
      this.syncPending()
    })
  }
}

// Singleton instance
export const syncService = new SubmissionSyncService()

// Auto-initialize in browser
if (typeof window !== 'undefined') {
  syncService.init()
}

