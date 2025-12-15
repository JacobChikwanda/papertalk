// Simple in-memory queue with concurrency control for AI processing
// Prevents too many simultaneous AI API calls and database connections

interface QueuedItem {
  submissionId: string
  imageUrls: string[]
}

class AIProcessingQueue {
  private queue: QueuedItem[] = []
  private processing = new Set<string>()
  // Reduce default concurrency to help with memory usage
  // Can be increased via AI_MAX_CONCURRENT env var if needed
  private maxConcurrent = parseInt(process.env.AI_MAX_CONCURRENT || '2')
  // Limit queue size to prevent memory buildup (each item holds image URLs)
  private maxQueueSize = parseInt(process.env.AI_MAX_QUEUE_SIZE || '10')

  async add(submissionId: string, imageUrls: string[]) {
    // Prevent queue from growing too large (memory protection)
    if (this.queue.length >= this.maxQueueSize) {
      console.warn(`AI queue is full (${this.maxQueueSize} items). Submission ${submissionId} will be queued when space is available.`)
      // Try again after a delay
      setTimeout(() => {
        if (this.queue.length < this.maxQueueSize) {
          this.queue.push({ submissionId, imageUrls })
          this.process()
        }
      }, 5000)
      return
    }
    
    // Check if already in queue or processing
    if (this.processing.has(submissionId) || this.queue.some(item => item.submissionId === submissionId)) {
      console.log(`Submission ${submissionId} is already queued or processing. Skipping.`)
      return
    }
    
    this.queue.push({ submissionId, imageUrls })
    this.process()
  }

  private async process() {
    // Don't process if we're at max concurrency or queue is empty
    if (this.processing.size >= this.maxConcurrent || this.queue.length === 0) {
      return
    }

    const { submissionId, imageUrls } = this.queue.shift()!
    this.processing.add(submissionId)

    try {
      const { generateDraftInternal } = await import('@/actions/generate-draft')
      await generateDraftInternal(submissionId, imageUrls)
    } catch (error) {
      console.error(`Error processing AI for submission ${submissionId}:`, error)
      
      // If it's a 503/429 error, re-queue it for later (after a delay)
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (errorMessage.includes('503') || errorMessage.includes('429') || errorMessage.includes('overloaded')) {
        console.log(`Re-queuing submission ${submissionId} due to service overload...`)
        // Re-add to queue after a delay (will be processed later)
        setTimeout(() => {
          this.queue.push({ submissionId, imageUrls })
          this.process()
        }, 10000) // Wait 10 seconds before re-queuing
      }
    } finally {
      this.processing.delete(submissionId)
      // Process next item in queue
      setImmediate(() => this.process())
    }
  }

  getQueueSize() {
    return this.queue.length
  }

  getProcessingCount() {
    return this.processing.size
  }

  getTotalPending() {
    return this.queue.length + this.processing.size
  }
}

// Singleton instance
export const aiQueue = new AIProcessingQueue()

