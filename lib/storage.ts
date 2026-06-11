import { createClient } from './supabase/server'

const BUCKET = 'personalvault'

export async function getUploadUrl(key: string): Promise<string> {
  const supabase = await createClient()
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(key)
  
  if (error) {
    throw new Error(`Gagal membuat Signed Upload URL: ${error.message}`)
  }
  
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
