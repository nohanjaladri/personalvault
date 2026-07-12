import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { fileId, thumbnailKey } = await request.json()

    if (!fileId || !thumbnailKey) {
      return NextResponse.json({ error: 'fileId and thumbnailKey are required' }, { status: 400 })
    }

    // Verify ownership first
    const { data: fileData, error: fetchError } = await supabase
      .from('files')
      .select('id')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !fileData) {
      return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 })
    }

    // Update thumbnail_key
    const { error: updateError } = await supabase
      .from('files')
      .update({ thumbnail_key: thumbnailKey })
      .eq('id', fileId)

    if (updateError) {
      throw new Error(updateError.message)
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("[Update Thumbnail] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
