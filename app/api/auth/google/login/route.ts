import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOAuth2Client } from '@/lib/oauth'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const oauth2Client = getOAuth2Client()

  // Generate auth URL dengan akses offline (penting untuk mendapatkan refresh_token)
  // dan scope terbatas drive.file agar aman
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive.file'
    ],
    state: user.id // Kirimkan user_id sebagai parameter state keamanan
  })

  return NextResponse.redirect(authUrl)
}
