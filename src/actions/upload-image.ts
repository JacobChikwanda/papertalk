'use server'

import { createAdminStorageClient } from '@/lib/supabase-server'

export async function uploadImage(imageData: string): Promise<{ success: boolean; url?: string; error?: string }> {
  try {
    // Convert data URL to buffer
    const response = await fetch(imageData)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Generate unique filename
    const fileName = `submissions/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`

    // Upload using admin client (bypasses RLS)
    const supabase = createAdminStorageClient()
    const { data, error } = await supabase.storage
      .from('exams')
      .upload(fileName, buffer, {
        contentType: 'image/jpeg',
        upsert: false,
      })

    if (error) {
      console.error('Error uploading image:', error)
      return { success: false, error: error.message }
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('exams').getPublicUrl(fileName)

    return { success: true, url: publicUrl }
  } catch (error: any) {
    console.error('Error in uploadImage:', error)
    return { success: false, error: error.message || 'Failed to upload image' }
  }
}

export async function uploadImages(imageDataArray: string[]): Promise<{ success: boolean; urls?: string[]; error?: string }> {
  try {
    const urls: string[] = []

    for (const imageData of imageDataArray) {
      const result = await uploadImage(imageData)
      if (result.success && result.url) {
        urls.push(result.url)
      } else {
        return { success: false, error: result.error || 'Failed to upload one or more images' }
      }
    }

    return { success: true, urls }
  } catch (error: any) {
    console.error('Error in uploadImages:', error)
    return { success: false, error: error.message || 'Failed to upload images' }
  }
}


