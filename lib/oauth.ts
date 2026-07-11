import { google } from 'googleapis'

export function getOAuth2Client(redirectUriOverride?: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  
  // Determine the base URL for redirect URI
  // Priority: override > env var > detected host (for development)
  let baseUrl: string
  
  if (redirectUriOverride) {
    baseUrl = redirectUriOverride
  } else if (process.env.NEXT_PUBLIC_APP_URL) {
    baseUrl = process.env.NEXT_PUBLIC_APP_URL
  } else {
    // Development fallback - use port 3000 (Next.js default)
    baseUrl = 'http://localhost:3000'
  }
  
  const redirectUri = `${baseUrl}/api/auth/google/callback`

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}
