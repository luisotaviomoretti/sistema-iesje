import { supabase } from '@/lib/supabase'

// Uploads a PDF blob to Supabase Storage and returns a durable URL
// Tries signed URL (preferred). If bucket is public, falls back to public URL.
// Returns null if upload fails (caller should handle gracefully).
export async function uploadEnrollmentPdf(enrollmentId: string, blob: Blob): Promise<string | null> {
  try {
    const bucket = 'enrollment-pdfs'
    const filePath = `enrollments/${enrollmentId}/latest.pdf`

    // Upload with upsert to always replace latest
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'application/pdf',
      })

    if (uploadError) {
      console.warn('[pdfStorage] Upload failed:', uploadError)
      return null
    }

    // Prefer a short-lived signed URL (7 days)
    const { data: signed, error: signedErr } = await supabase.storage
      .from(bucket)
      .createSignedUrl(filePath, 7 * 24 * 60 * 60) // 7 days

    if (!signedErr && signed?.signedUrl) {
      return signed.signedUrl
    }

    // Fall back to public URL if bucket is public
    const { data: pub } = supabase.storage.from(bucket).getPublicUrl(filePath)
    if (pub?.publicUrl) return pub.publicUrl

    return null
  } catch (err) {
    console.warn('[pdfStorage] Unexpected error during upload:', err)
    return null
  }
}
