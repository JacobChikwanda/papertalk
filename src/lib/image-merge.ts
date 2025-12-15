// Server-side image merging service
// Combines multiple images into a single PDF for efficient storage and AI processing

import { PDFDocument } from 'pdf-lib'
import { createAdminStorageClient } from './supabase-server'

export async function mergeImages(
  imageUrls: string[],
  testId: string,
  studentEmail: string
): Promise<string | null> {
  if (imageUrls.length === 0) {
    return null
  }

  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create()

    // Fetch and add each image to the PDF
    for (const imageUrl of imageUrls) {
      try {
        // Fetch the image
        const imageResponse = await fetch(imageUrl)
        if (!imageResponse.ok) {
          console.error(`Failed to fetch image ${imageUrl}:`, imageResponse.statusText)
          continue
        }

        const imageBytes = await imageResponse.arrayBuffer()
        const imageBuffer = Buffer.from(imageBytes)

        // Determine image type from content type or URL
        const contentType = imageResponse.headers.get('content-type') || ''
        let image: any

        if (contentType.includes('png') || imageUrl.toLowerCase().endsWith('.png')) {
          image = await pdfDoc.embedPng(imageBuffer)
        } else if (contentType.includes('jpeg') || contentType.includes('jpg') || 
                   imageUrl.toLowerCase().match(/\.(jpg|jpeg)$/i)) {
          image = await pdfDoc.embedJpg(imageBuffer)
        } else {
          // Try PNG first, then JPG
          try {
            image = await pdfDoc.embedPng(imageBuffer)
          } catch {
            image = await pdfDoc.embedJpg(imageBuffer)
          }
        }

        // Add a new page with the image
        const page = pdfDoc.addPage([image.width, image.height])
        page.drawImage(image, {
          x: 0,
          y: 0,
          width: image.width,
          height: image.height,
        })
      } catch (error) {
        console.error(`Error processing image ${imageUrl}:`, error)
        // Continue with other images
      }
    }

    // If no pages were added, return null
    if (pdfDoc.getPageCount() === 0) {
      return null
    }

    // Generate PDF bytes
    const pdfBytes = await pdfDoc.save()

    // Upload to Supabase Storage
    const supabase = createAdminStorageClient()
    const fileName = `merged/${testId}/${Date.now()}-${studentEmail.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('exams')
      .upload(fileName, pdfBytes, {
        contentType: 'application/pdf',
        upsert: true,
      })

    if (uploadError) {
      console.error('Error uploading merged PDF:', uploadError)
      return null
    }

    // Get public URL
    const {
      data: { publicUrl },
    } = supabase.storage.from('exams').getPublicUrl(fileName)

    return publicUrl
  } catch (error) {
    console.error('Error merging images:', error)
    return null
  }
}

