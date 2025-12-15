'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'

// Internal function for background processing (no auth required)
async function generateDraftInternal(submissionId: string, imageUrls: string[], previousFeedback?: string) {
  try {
    // Verify submission exists and get test paper
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        test: {
          include: {
            testPaper: true,
          },
        },
      },
    })

    if (!submission) {
      return { success: false, error: 'Submission not found' }
    }
    // #region agent log
    const apiKeyRaw = process.env.GOOGLE_GEMINI_API_KEY
    fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-draft.ts:19',message:'API key check',data:{exists:!!apiKeyRaw,length:apiKeyRaw?.length||0,startsWith:apiKeyRaw?.substring(0,5)||'N/A'},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion
    const apiKey = apiKeyRaw!
    // Use v1 API with gemini-2.5-flash (latest model per official docs)
    const model = 'gemini-2.5-flash'
    const apiVersion = 'v1'

    // Build prompt for batch grading
    const studentName = submission.studentName || 'Student'
    let prompt = `You are an expert teacher grading student exam papers. 
You are grading the submission for ${studentName}.

IMPORTANT - PERSONALIZATION:
- Address the student by name (${studentName}) throughout your feedback
- Use a supportive, encouraging, and constructive tone
- Be specific and actionable in your advice - help them understand their mistakes and how to improve
- Focus on helping the student learn and grow, not just pointing out errors
- Acknowledge what they did well, even if the overall performance needs improvement
- Use phrases like "${studentName}, your submission shows..." or "Dear ${studentName}, here's your feedback..."

Analyze the student's submission against the original question paper and provide comprehensive, accurate, and personalized feedback.

CRITICAL GRADING RULES:
1. You will be shown the ORIGINAL QUESTION PAPER first, followed by the STUDENT'S ANSWER SHEET
2. You MUST identify ALL questions in the question paper and check if each one was answered
3. Missing answers should result in ZERO marks for that question
4. Partial answers should receive partial credit only (e.g., if a question is worth 10 marks and only half answered, give 5 marks)
5. Be STRICT and ACCURATE - do not give credit for unanswered questions or incomplete answers
6. The score should reflect the actual percentage of correct/complete answers, not be inflated

IMPORTANT: The images are provided in sequential order. The question paper images come FIRST, followed by the student's answer images in the same order.

Instructions:
1. FIRST, carefully review the question paper to identify:
   - All questions and their numbers
   - Sections (e.g., Section A, Section B)
   - Total number of questions
   - Mark allocation if visible
2. THEN, review the student's answers in order and match them to the corresponding questions
3. For EACH question, determine:
   - Was it answered? (Yes/No/Partial)
   - If answered, is it correct, incorrect, or partially correct?
   - What marks should be awarded?
4. Identify ALL unanswered questions clearly (e.g., "Question 3 was not attempted", "Section B Question 2 is blank")
5. Calculate the score based on:
   - Full marks for fully correct answers
   - Partial marks for partially correct answers
   - ZERO marks for unanswered or completely incorrect answers
6. Be STRICT: If a student missed 50% of questions, the score should be around 50% or less, not 80%
7. Provide detailed, personalized feedback on:
   - Each question answered (correct/incorrect/partial) with explanation - address ${studentName} directly
   - Each question NOT answered (list all missing questions) - explain what ${studentName} missed
   - Overall performance assessment - written directly to ${studentName} with encouragement
   - Areas for improvement - specific, actionable advice tailored to ${studentName}'s performance
8. Be constructive, encouraging, and ACCURATE - do not inflate scores, but help ${studentName} understand how to improve
9. Format your response in clear sections, but use plain text only (no markdown formatting)
10. At the end of your response, provide a numerical score from 0-100 based on ACTUAL performance. Format it exactly as: "SCORE: [number]" on its own line at the very end.

SCORING GUIDELINES:
- If 20% of questions are unanswered → maximum score should be around 80%
- If 50% of questions are unanswered → maximum score should be around 50%
- If questions are partially answered → award proportional marks only
- Be conservative with partial credit - only give marks for what is actually correct`

    // If regenerating, include previous feedback as context to maintain consistency
    if (previousFeedback) {
      prompt += `\n\nIMPORTANT: This is a regeneration request. A previous grading was done for this submission. Please maintain consistency with the previous assessment while providing your feedback. Here is the previous feedback for reference:\n\n${previousFeedback}\n\nPlease provide updated feedback that is similar in structure and assessment, but you may refine or improve it. Ensure your score is close to the previous assessment unless you identify significant errors in the previous grading.`
    }

    if (submission.test?.testPaper?.fileUrl) {
      prompt += `\n\nYou will first see the ORIGINAL QUESTION PAPER, then the STUDENT'S ANSWERS. Compare them carefully and grade strictly based on what was actually answered correctly.`
    }

    prompt += `\n\nPlease grade this exam submission, ensuring answers are properly aligned with their corresponding questions. Be strict and accurate with scoring.`

    // Collect all images: question paper first (if available), then student answers
    const allImageUrls: string[] = []
    
    // Add question paper if available
    if (submission.test?.testPaper?.fileUrl) {
      allImageUrls.push(submission.test.testPaper.fileUrl)
    }
    
    // Add student submission images
    allImageUrls.push(...imageUrls)

    // Fetch images/PDFs and convert to base64 for Gemini
    // Process sequentially to reduce memory pressure (instead of Promise.all)
    const imageParts: Array<{ inlineData: { mimeType: string; data: string } } | null> = []
    
    for (const url of allImageUrls) {
      try {
        const imageResponse = await fetch(url)
        const imageBuffer = await imageResponse.arrayBuffer()
        
        // Determine MIME type from URL or response
        let contentType = imageResponse.headers.get('content-type') || 'image/jpeg'
        
        // Handle PDF files
        if (url.toLowerCase().endsWith('.pdf') || contentType === 'application/pdf') {
          contentType = 'application/pdf'
        } else if (!contentType.startsWith('image/')) {
          // Default to JPEG if unknown
          contentType = 'image/jpeg'
        }
        
        // Convert to base64 - this will be kept in memory until API call completes
        const base64Image = Buffer.from(imageBuffer).toString('base64')
        
        imageParts.push({
          inlineData: {
            mimeType: contentType,
            data: base64Image,
          },
        })
        
        // The imageBuffer will be garbage collected after this scope
        // We process sequentially so only one image buffer is in memory at a time
      } catch (error) {
        console.error(`Error fetching image ${url}:`, error)
        imageParts.push(null)
      }
    }

    // Filter out any failed image fetches
    const validImageParts = imageParts.filter((part) => part !== null) as Array<{ inlineData: { mimeType: string; data: string } }>
    
    if (validImageParts.length === 0) {
      throw new Error('No valid images found for processing')
    }

    // #region agent log
    const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`
    fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-draft.ts:74',message:'Before API call',data:{urlLength:apiUrl.length,hasKey:apiUrl.includes('key='),model,imageCount:validImageParts.length},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    // Call Gemini API REST endpoint with retry logic for 503/429 errors
    const maxRetries = 3
    const baseDelay = 2000 // 2 seconds
    let lastError: Error | null = null
    let data: any = null
    let fullResponse: string = ''

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await fetch(
          apiUrl,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { text: prompt },
                    ...validImageParts,
                  ],
                },
              ],
            }),
          }
        )

        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-draft.ts:94',message:'API response status',data:{status:response.status,statusText:response.statusText,ok:response.ok,attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'C'})}).catch(()=>{});
        // #endregion

        if (response.ok) {
          // Success - break out of retry loop
          data = await response.json()
          fullResponse = data.candidates[0].content.parts[0].text
          
          // Clear image data from memory after successful API call
          // The base64 strings will be garbage collected
          validImageParts.length = 0
          break
        }

        // Handle error response
        const errorText = await response.text()
        // #region agent log
        fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-draft.ts:96',message:'API error response',data:{status:response.status,errorText:errorText.substring(0,500),attempt},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'D'})}).catch(()=>{});
        // #endregion

        // Check if we should retry (503 Service Unavailable or 429 Too Many Requests)
        const shouldRetry = (response.status === 503 || response.status === 429) && attempt < maxRetries
        
        if (shouldRetry) {
          // Exponential backoff: 2s, 4s, 8s
          const delay = baseDelay * Math.pow(2, attempt)
          console.log(`Gemini API ${response.status} error (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue // Retry
        }

        // Non-retryable error or max retries reached
        lastError = new Error(`Gemini API error: ${response.statusText} - ${errorText}`)
        throw lastError
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        
        // Only retry on network errors or if we haven't reached max retries
        if (attempt < maxRetries && (error instanceof TypeError || (error instanceof Error && error.message.includes('fetch')))) {
          const delay = baseDelay * Math.pow(2, attempt)
          console.log(`Network error (attempt ${attempt + 1}/${maxRetries + 1}). Retrying in ${delay}ms...`)
          await new Promise(resolve => setTimeout(resolve, delay))
          continue
        }
        
        // Re-throw if we can't retry
        throw error
      }
    }

    // If we don't have data after all retries, throw error
    if (!data || !fullResponse) {
      throw lastError || new Error('Failed to generate draft feedback after retries')
    }

    // Extract score from response (look for "SCORE: [number]" at the end)
    let feedback = fullResponse
    let aiScore: number | null = null
    
    // Try multiple patterns to extract score
    // Pattern 1: "SCORE: 14" at the end
    let scoreMatch = fullResponse.match(/SCORE:\s*(\d+)(?:\s*\/\s*100)?\s*$/im)
    // Pattern 2: "SCORE: 14" on its own line near the end
    if (!scoreMatch) {
      scoreMatch = fullResponse.match(/(?:^|\n)SCORE:\s*(\d+)(?:\s*\/\s*100)?\s*(?:\n|$)/im)
    }
    // Pattern 3: "Final Score: 14" or "Total Score: 14"
    if (!scoreMatch) {
      scoreMatch = fullResponse.match(/(?:Final|Total)\s+Score:\s*(\d+)(?:\s*\/\s*100)?/i)
    }
    
    if (scoreMatch) {
      const extractedScore = parseInt(scoreMatch[1], 10)
      if (!isNaN(extractedScore) && extractedScore >= 0 && extractedScore <= 100) {
        aiScore = extractedScore
        // Remove the score line from feedback (try multiple patterns)
        feedback = fullResponse
          .replace(/SCORE:\s*\d+(?:\s*\/\s*100)?\s*$/im, '')
          .replace(/(?:^|\n)SCORE:\s*\d+(?:\s*\/\s*100)?\s*(?:\n|$)/im, '')
          .replace(/(?:Final|Total)\s+Score:\s*\d+(?:\s*\/\s*100)?/i, '')
          .trim()
      }
    }

    // Update submission with AI feedback, score, and set status to ready
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiFeedback: feedback,
        finalScore: aiScore, // Save AI-generated score
        processingStatus: 'ready',
      },
    })

    // Revalidate paths (only if not in background queue context)
    // The queue will handle revalidation separately if needed
    try {
      const { revalidatePath } = await import('next/cache')
      if (submission.testId) {
        revalidatePath(`/teacher/tests/${submission.testId}`)
      }
      revalidatePath(`/grade/${submissionId}`)
    } catch (error) {
      // Silently fail if revalidation is not available (e.g., in background context)
      console.log('Revalidation skipped (background context)')
    }
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-draft.ts:113',message:'API call successful',data:{feedbackLength:feedback?.length||0},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'E'})}).catch(()=>{});
    // #endregion

    return { success: true, feedback, score: aiScore }
  } catch (error) {
    // #region agent log
    const errorMsg = error instanceof Error ? error.message : String(error)
    fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'generate-draft.ts:115',message:'Error caught',data:{errorType:error?.constructor?.name,errorMessage:errorMsg.substring(0,500)},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'F'})}).catch(()=>{});
    // #endregion
    console.error('Error generating draft:', error)
    // Set status back to pending on error
    await prisma.submission.update({
      where: { id: submissionId },
      data: { processingStatus: 'pending' },
    }).catch(console.error)
    return { success: false, error: 'Failed to generate draft feedback' }
  }
}

// Public function with auth (for manual triggers)
export async function generateDraft(submissionId: string, imageUrls: string[], regenerate: boolean = false) {
  const user = await requireAuth()
  requirePermission(user.role, 'submission:grade')

  try {
    // Verify submission belongs to user's organization
    const submission = await prisma.submission.findFirst({
      where: {
        id: submissionId,
        organizationId: user.organizationId,
      },
    })

    if (!submission) {
      return { success: false, error: 'Submission not found' }
    }

    // If regenerating, get previous feedback for context
    const previousFeedback = regenerate && submission.aiFeedback ? submission.aiFeedback : undefined

    // Update status to processing_ai
    await prisma.submission.update({
      where: { id: submissionId },
      data: { processingStatus: 'processing_ai' },
    })

    // Call internal function with previous feedback if regenerating
    return await generateDraftInternal(submissionId, imageUrls, previousFeedback)
  } catch (error) {
    console.error('Error generating draft:', error)
    return { success: false, error: 'Failed to generate draft feedback' }
  }
}

// Export internal function for use in createSubmission
export { generateDraftInternal }
