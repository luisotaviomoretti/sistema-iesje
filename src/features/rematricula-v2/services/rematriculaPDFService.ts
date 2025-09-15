import { supabase } from '@/lib/supabase'

export const RematriculaPDFService = {
  async updatePdfInfo(enrollmentId: string, pdfUrl: string): Promise<void> {
    const { error } = await supabase
      .from('enrollments')
      .update({
        pdf_url: pdfUrl,
        pdf_generated_at: new Date().toISOString(),
        status: 'submitted',
      })
      .eq('id', enrollmentId)

    if (error) throw error
  },
}
