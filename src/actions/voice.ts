'use server'

import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/auth'
import { ElevenLabsClient } from '@elevenlabs/elevenlabs-js'
import { Readable } from 'stream'

/**
 * Get available ElevenLabs voices
 */
export async function getAvailableVoices() {
  const user = await requireAuth()
  
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return { success: false, error: 'ELEVENLABS_API_KEY not configured' }
  }

  try {
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey.trim(),
    })

    const voices = await elevenlabs.voices.getAll()
    
    // Categorize voices by gender (based on name/description)
    const categorizedVoices = voices.voices.map(voice => ({
      id: voice.voiceId,
      name: voice.name,
      category: voice.category || 'premade',
      description: voice.description || '',
      gender: voice.labels?.gender || 'unknown', // Some voices have gender labels
    }))

    return { success: true, voices: categorizedVoices }
  } catch (error: any) {
    console.error('Error fetching voices:', error)
    return { success: false, error: error.message || 'Failed to fetch voices' }
  }
}

/**
 * Clone user's voice from audio file
 */
export async function cloneVoice(audioFile: File, voiceName: string) {
  const user = await requireAuth()
  
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    return { success: false, error: 'ELEVENLABS_API_KEY not configured' }
  }

  try {
    const elevenlabs = new ElevenLabsClient({
      apiKey: apiKey.trim(),
    })

    // Convert File to stream for ElevenLabs API
    // The API expects ReadableStream, so we convert the File to a stream
    const arrayBuffer = await audioFile.arrayBuffer()
    const audioBuffer = Buffer.from(arrayBuffer)
    
    // Create a readable stream from the buffer (similar to fs.createReadStream)
    const audioStream = Readable.from(audioBuffer)

    // Clone voice using ElevenLabs IVC (Instant Voice Cloning) API
    const clonedVoice = await elevenlabs.voices.ivc.create({
      name: voiceName || `${user.name}'s Voice`,
      files: [audioStream],
    })

    // Save voice ID to user profile
    await prisma.user.update({
      where: { id: user.id },
      data: {
        voiceId: clonedVoice.voiceId,
      },
    })

    return { success: true, voiceId: clonedVoice.voiceId }
  } catch (error: any) {
    console.error('Error cloning voice:', error)
    return { success: false, error: error.message || 'Failed to clone voice. Please ensure the audio file is clear and 1-5 minutes long.' }
  }
}

/**
 * Update user's voice preferences
 */
export async function updateVoicePreferences(voiceId: string, preferences?: {
  gender?: 'male' | 'female'
  speed?: number
  stability?: number
  similarityBoost?: number
}) {
  const user = await requireAuth()

  try {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        voiceId: voiceId,
        voiceSettings: preferences || {},
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error updating voice preferences:', error)
    return { success: false, error: 'Failed to update voice preferences' }
  }
}

