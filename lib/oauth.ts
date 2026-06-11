import { google } from 'googleapis'

export function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  // Gunakan APP_URL yang fleksibel (default ke localhost jika env kosong)
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/api/auth/google/callback`

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}
