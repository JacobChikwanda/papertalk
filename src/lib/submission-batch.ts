// Client-side submission batching using localStorage
// Reduces database load by batching multiple submissions together

export interface PendingSubmission {
  id: string // Local UUID
  studentName: string
  studentEmail: string
  imageUrls: string[]
  magicLinkToken: string
  createdAt: number
  syncStatus: 'pending' | 'syncing' | 'synced' | 'error'
  serverId?: string // After successful sync
  errorMessage?: string // If sync failed
}

const STORAGE_KEY = 'papertalk_pending_submissions'
const BATCH_SIZE = parseInt(process.env.NEXT_PUBLIC_SUBMISSION_BATCH_SIZE || '5')

export class SubmissionBatchManager {
  private getPendingSubmissions(): PendingSubmission[] {
    if (typeof window === 'undefined') return []
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (!stored) return []
      
      const submissions: PendingSubmission[] = JSON.parse(stored)
      // Filter out synced items older than 1 hour (cleanup)
      const oneHourAgo = Date.now() - 60 * 60 * 1000
      const active = submissions.filter(
        (s) => s.syncStatus !== 'synced' || s.createdAt > oneHourAgo
      )
      
      // Update storage if we filtered anything
      if (active.length !== submissions.length) {
        this.savePendingSubmissions(active)
      }
      
      return active
    } catch (error) {
      console.error('Error reading pending submissions:', error)
      return []
    }
  }

  private savePendingSubmissions(submissions: PendingSubmission[]) {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(submissions))
    } catch (error) {
      console.error('Error saving pending submissions:', error)
      // Handle quota exceeded error
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        // Remove oldest synced items
        const synced = submissions.filter((s) => s.syncStatus === 'synced')
        const pending = submissions.filter((s) => s.syncStatus !== 'synced')
        const sortedSynced = synced.sort((a, b) => a.createdAt - b.createdAt)
        const toKeep = sortedSynced.slice(-10) // Keep last 10 synced
        this.savePendingSubmissions([...pending, ...toKeep])
      }
    }
  }

  addSubmission(data: {
    studentName: string
    studentEmail: string
    imageUrls: string[]
    magicLinkToken: string
  }): PendingSubmission {
    const submission: PendingSubmission = {
      id: `local_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      ...data,
      createdAt: Date.now(),
      syncStatus: 'pending',
    }

    const pending = this.getPendingSubmissions()
    pending.push(submission)
    this.savePendingSubmissions(pending)

    return submission
  }

  getPendingCount(): number {
    return this.getPendingSubmissions().filter((s) => s.syncStatus === 'pending').length
  }

  getPendingSubmissionsForSync(): PendingSubmission[] {
    return this.getPendingSubmissions().filter((s) => s.syncStatus === 'pending')
  }

  shouldSync(): boolean {
    return this.getPendingCount() >= BATCH_SIZE
  }

  markAsSyncing(submissionIds: string[]) {
    const pending = this.getPendingSubmissions()
    pending.forEach((submission) => {
      if (submissionIds.includes(submission.id)) {
        submission.syncStatus = 'syncing'
      }
    })
    this.savePendingSubmissions(pending)
  }

  markAsSynced(localId: string, serverId: string) {
    const pending = this.getPendingSubmissions()
    const submission = pending.find((s) => s.id === localId)
    if (submission) {
      submission.syncStatus = 'synced'
      submission.serverId = serverId
    }
    this.savePendingSubmissions(pending)
  }

  markAsError(localId: string, errorMessage: string) {
    const pending = this.getPendingSubmissions()
    const submission = pending.find((s) => s.id === localId)
    if (submission) {
      submission.syncStatus = 'error'
      submission.errorMessage = errorMessage
    }
    this.savePendingSubmissions(pending)
  }

  removeSynced() {
    const pending = this.getPendingSubmissions()
    const active = pending.filter((s) => s.syncStatus !== 'synced')
    this.savePendingSubmissions(active)
  }

  clearAll() {
    if (typeof window === 'undefined') return
    localStorage.removeItem(STORAGE_KEY)
  }
}

// Singleton instance
export const batchManager = new SubmissionBatchManager()

