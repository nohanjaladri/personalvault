import { createClient } from './supabase/server'

export const BUCKET = 'personalvault'

export async function getUploadUrl(key: string): Promise<string> {
  const supabase = await createClient()
  
  // Log detail untuk debugging
  console.log('[Storage] Creating signed upload URL for key:', key)
  console.log('[Storage] Bucket:', BUCKET)
  
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key)
  
  if (error) {
    console.error('[Storage] Failed to create signed upload URL:', {
      key,
      bucket: BUCKET,
      error: error.message,
      statusCode: (error as any).statusCode,
      hint: (error as any).hint,
      details: (error as any).details
    })
    throw new Error(`Gagal membuat Signed Upload URL untuk "${key}": ${error.message}`)
  }
  
  if (!data?.signedUrl) {
    console.error('[Storage] No signedUrl returned from Supabase')
    throw new Error('No signed URL returned from storage')
  }
  
  console.log('[Storage] Successfully created signed upload URL')
  return data.signedUrl
}

export async function getDownloadUrl(key: string, isThumbnail = false): Promise<string> {
  const supabase = await createClient()
  
  const options = isThumbnail ? {
    transform: {
      width: 320,
      height: 240,
      resize: 'cover' as const,
      quality: 60
    }
  } : undefined

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(key, 900, options)
  
  if (error) {
    throw new Error(`Gagal membuat Signed Download URL: ${error.message}`)
  }
  
  return data.signedUrl
}

export async function deleteStorageObject(key: string): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.storage.from(BUCKET).remove([key])
  
  if (error) {
    throw new Error(`Gagal menghapus file dari storage: ${error.message}`)
  }
}
