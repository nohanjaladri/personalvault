import { google } from 'googleapis'
import { getOAuth2Client } from './oauth'
import { createClient } from './supabase/server'

// Dapatkan OAuth2Client dan Google Drive client yang di-authorize
export async function getAuthorizedGoogleClientAndAuth(userId: string) {
  const supabase = await createClient()
  
  const { data: tokenData, error } = await supabase
    .from('user_google_tokens')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error || !tokenData) {
    throw new Error('Google Drive belum terhubung. Silakan hubungkan di halaman Pengaturan.')
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({
    access_token: tokenData.access_token,
    refresh_token: tokenData.refresh_token,
    expiry_date: Number(tokenData.expiry_date)
  })

  // Periksa apakah token perlu di-refresh
  const isExpired = Date.now() >= Number(tokenData.expiry_date) - 60000 // Berikan buffer 1 menit
  
  if (isExpired && tokenData.refresh_token) {
    try {
      const { credentials } = await oauth2Client.refreshAccessToken()
      oauth2Client.setCredentials(credentials)

      // Update token baru di database
      const updateData: any = {
        access_token: credentials.access_token!,
        expiry_date: credentials.expiry_date!,
      }

      const { error: updateErr } = await supabase
        .from('user_google_tokens')
        .update(updateData)
        .eq('user_id', userId)

      if (updateErr) console.error('Gagal menyimpan refreshed token:', updateErr)
    } catch (err) {
      console.error('Gagal me-refresh token Google OAuth:', err)
      throw new Error('Koneksi Google Drive kedaluwarsa. Silakan hubungkan ulang di halaman Pengaturan.')
    }
  }

  const drive = google.drive({ version: 'v3', auth: oauth2Client })
  return { drive, oauth2Client }
}

// Dapatkan Google Drive client yang sudah di-authorize
export async function getAuthorizedGoogleClient(userId: string) {
  const { drive } = await getAuthorizedGoogleClientAndAuth(userId)
  return drive
}
