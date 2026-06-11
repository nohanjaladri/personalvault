import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ isConnected: false }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('user_google_tokens')
    .select('user_id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error || !data) {
    return NextResponse.json({ isConnected: false })
  }

  return NextResponse.json({ isConnected: true })
}

export async function DELETE(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { error } = await supabase
    .from('user_google_tokens')
    .delete()
    .eq('user_id', user.id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
