import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOAuth2Client } from '@/lib/oauth'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  if (error) {
    console.error('OAuth Callback Error:', error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/settings?error=oauth_denied`)
  }

  if (!code) {
    return NextResponse.json({ error: 'Code not found' }, { status: 400 })
  }

  try {
    const oauth2Client = getOAuth2Client()
    const { tokens } = await oauth2Client.getToken(code)

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Simpan token ke database. Jika refresh_token tidak dikirim ulang oleh Google,
    // biarkan kolom refresh_token bernilai token lama (upsert parsial)
    const tokenData: any = {
      user_id: user.id,
      access_token: tokens.access_token,
      expiry_date: tokens.expiry_date,
    }

    if (tokens.refresh_token) {
      tokenData.refresh_token = tokens.refresh_token
    }

    const { error: dbErr } = await supabase
      .from('user_google_tokens')
      .upsert(tokenData)

    if (dbErr) {
      console.error('Database token storage error:', dbErr)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/settings?error=db_error`)
    }

    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/settings?success=google_connected`)
  } catch (err: any) {
    console.error('Google OAuth Callback Exception:', err)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}/settings?error=oauth_exception`)
  }
}
