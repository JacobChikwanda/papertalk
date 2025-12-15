'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { requirePermission } from '@/lib/permissions'
import { revalidatePath } from 'next/cache'
import { createServerSupabaseClient } from '@/lib/supabase-server'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { sendFeedbackInBackground } from '@/actions/feedback'

// Background function to generate audio (doesn't block the main response)
async function generateAudioInBackground(
  submissionId: string,
  finalFeedback: string,
  apiKey: string,
  voiceId: string,
  studentName: string
) {
  let audioUrl: string | null = null

  // Helper function to generate audio from text
  const generateAudio = async (text: string): Promise<string> => {
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey,
    })

    const audio = await elevenlabs.textToSpeech.convert(voiceId, {
      text: text,
      modelId: 'eleven_multilingual_v2',
      outputFormat: 'mp3_44100_128',
    })

    const reader = audio.getReader()
    const chunks: Uint8Array[] = []
    while (true) {
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
    }
    const audioBuffer = Buffer.concat(chunks)
    
    const { createAdminStorageClient } = await import('@/lib/supabase-server')
    const supabase = createAdminStorageClient()
    const fileName = `${submissionId}-audio.mp3`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exams')
      .upload(fileName, audioBuffer, {
        contentType: 'audio/mpeg',
        upsert: true,
      })

    if (uploadError) {
      throw new Error(`Failed to upload audio to Supabase: ${uploadError.message}`)
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('exams').getPublicUrl(fileName)
    return publicUrl
  }

  // Helper function to truncate text to fit within credit limit
  const truncateTextForQuota = (text: string, maxCredits: number): string => {
    const safeLimit = Math.floor(maxCredits * 0.95)
    
    if (text.length <= safeLimit) {
      return text
    }
    
    const truncated = text.substring(0, safeLimit)
    const lastSpace = truncated.lastIndexOf(' ')
    const finalText = lastSpace > safeLimit * 0.9 
      ? truncated.substring(0, lastSpace) 
      : truncated
    
    return finalText + '... [Audio truncated due to quota limits. Full feedback available in text.]'
  }

  // Helper function to generate AI-optimized audio summary using Gemini
  const generateAudioOptimizedSummary = async (
    fullFeedback: string,
    studentName: string,
    maxLength: number
  ): Promise<string> => {
    const geminiApiKey = process.env.GOOGLE_GEMINI_API_KEY
    if (!geminiApiKey) {
      throw new Error('GOOGLE_GEMINI_API_KEY not configured')
    }

    const model = 'gemini-2.5-flash'
    const apiVersion = 'v1'
    const apiUrl = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${geminiApiKey}`

    const prompt = `You are a supportive teacher creating a brief, personalized audio feedback summary for ${studentName}.

The full detailed feedback is:
${fullFeedback}

Create a concise, conversational audio summary (maximum ${maxLength} characters) that:
1. Addresses ${studentName} directly and personally
2. Highlights 2-3 most important areas for improvement
3. Acknowledges what they did well
4. Provides specific, actionable advice
5. Uses a warm, encouraging tone suitable for spoken audio
6. Focuses on helping them understand where to improve and how

Write it as if you're speaking directly to ${studentName}. Make it natural and conversational, not formal or structured. Do not include section headers, question numbers, or mark breakdowns - just speak naturally about their performance and how to improve.`

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error: ${response.statusText} - ${errorText}`)
    }

    const data = await response.json()
    const summary = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim()

    if (!summary) {
      throw new Error('Failed to generate audio summary from Gemini')
    }

    return summary.length > maxLength
      ? summary.substring(0, maxLength - 50) + '...'
      : summary
  }

  // Helper function to extract available credits from error message
  const extractAvailableCredits = (errorMessage: string): number | null => {
    const match = errorMessage.match(/You have (\d+) credits remaining/)
    if (match) {
      return parseInt(match[1], 10)
    }
    return null
  }

  try {
    // Try with full text first
    try {
      audioUrl = await generateAudio(finalFeedback)
    } catch (audioError: any) {
      // Check if it's a quota exceeded error
      if (audioError?.statusCode === 401 && audioError?.body?.detail?.status === 'quota_exceeded') {
        const detail = audioError.body.detail
        const errorMessage = detail.message || ''
        const availableCredits = extractAvailableCredits(errorMessage)
        
        if (availableCredits && availableCredits > 200) {
          // Try to generate AI-optimized summary first
          try {
            const audioSummary = await generateAudioOptimizedSummary(
              finalFeedback,
              studentName,
              Math.floor(availableCredits * 0.95)
            )
            audioUrl = await generateAudio(audioSummary)
          } catch (summaryError: any) {
            // Fallback to truncation if AI summary generation fails
            const truncatedText = truncateTextForQuota(finalFeedback, availableCredits)
            audioUrl = await generateAudio(truncatedText)
          }
        } else if (availableCredits && availableCredits > 100) {
          // Not enough credits for AI summary, but enough for truncation
          const truncatedText = truncateTextForQuota(finalFeedback, availableCredits)
          audioUrl = await generateAudio(truncatedText)
        } else {
          throw audioError
        }
      } else {
        throw audioError
      }
    }

    // Update submission with audio URL
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        audioUrl: audioUrl,
        processingStatus: 'graded', // Audio generation complete
      },
    })

    revalidatePath(`/grade/${submissionId}`)
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('Background audio generation error:', error)
    // Update status to indicate audio generation failed (but grade is still saved)
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        processingStatus: 'graded', // Audio failed but grade is complete
      },
    })
    revalidatePath(`/grade/${submissionId}`)
    revalidatePath('/dashboard')
  }
}

export async function finalizeGrade(
  submissionId: string,
  finalFeedback: string,
  finalScore: number,
  voiceId?: string // Optional voice ID, will use default or user's voice if not provided
) {
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

    // Generate audio using ElevenLabs API
    const apiKey = process.env.ELEVENLABS_API_KEY
    
    // Get user with voice settings
    const userWithVoice = await prisma.user.findUnique({
      where: { id: user.id },
      select: { voiceId: true },
    })

    // Determine voice ID: use provided, then user's cloned voice, then default
    let selectedVoiceId = voiceId
    if (!selectedVoiceId && userWithVoice?.voiceId) {
      selectedVoiceId = userWithVoice.voiceId
    }
    if (!selectedVoiceId) {
      selectedVoiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM' // Default voice
    }

    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'finalize-grade.ts:32',message:'API key check',data:{exists:!!apiKey,isNull:apiKey===null,isUndefined:apiKey===undefined,isEmpty:apiKey==='',length:apiKey?.length||0,startsWith:apiKey?.substring(0,5)||'N/A',endsWith:apiKey?.substring(Math.max(0,(apiKey?.length||0)-5))||'N/A',hasWhitespace:apiKey?.trim()!==apiKey},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    // #endregion

    if (!apiKey) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'finalize-grade.ts:35',message:'API key missing - early return',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
      // #endregion
      return { 
        success: false, 
        error: 'ELEVENLABS_API_KEY is not configured. Please set it in your environment variables.' 
      }
    }

    // Validate API key format (should not be empty or just whitespace)
    const trimmedKey = apiKey.trim()
    // #region agent log
    fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'finalize-grade.ts:43',message:'API key after trim',data:{originalLength:apiKey.length,trimmedLength:trimmedKey.length,isEmpty:trimmedKey===''},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
    // #endregion

    if (!trimmedKey) {
      // #region agent log
      fetch('http://127.0.0.1:7243/ingest/e2b8fb36-07d7-4b1a-b6c9-c8b8d089c4b6',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'finalize-grade.ts:46',message:'API key empty after trim - early return',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
      // #endregion
      return { 
        success: false, 
        error: 'ELEVENLABS_API_KEY is empty. Please set a valid API key in your environment variables.' 
      }
    }

    // Get organization settings for auto-approve
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { settings: true },
    })
    const orgSettings = (organization?.settings as any) || {}
    const autoApprove = orgSettings.autoApproveFeedback || false

    // Update submission immediately (save grade first, audio will be generated in background)
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        aiFeedback: finalFeedback,
        finalScore: finalScore,
        status: 'graded',
        processingStatus: 'generating_audio', // Set status to indicate audio is being generated
        voiceId: selectedVoiceId, // Store the voice ID used
        feedbackApproved: autoApprove, // Auto-approve if setting is enabled
      },
    })

    revalidatePath(`/grade/${submissionId}`)
    revalidatePath('/dashboard')

    // Generate audio in background (don't await - let it run async)
    generateAudioInBackground(submissionId, finalFeedback, trimmedKey, selectedVoiceId, submission.studentName || 'Student')
      .then(() => {
        // Auto-send if enabled and auto-approved
        if (autoApprove && orgSettings.autoSendFeedback) {
          return sendFeedbackInBackground(submissionId, submission.studentEmail)
        }
      })
      .catch(console.error)
      .catch((error) => {
        console.error('Background audio generation failed:', error)
        // Update status to indicate audio generation failed (but grade is still saved)
        prisma.submission.update({
          where: { id: submissionId },
          data: {
            processingStatus: 'graded', // Audio failed but grade is complete
          },
        }).catch(console.error)
      })

    return { success: true, audioUrl: null } // Audio will be available later
  } catch (error) {
    console.error('Error finalizing grade:', error)
    return { success: false, error: 'Failed to finalize grade' }
  }
}
