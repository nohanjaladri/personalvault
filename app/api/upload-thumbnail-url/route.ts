import { createClient } from '@/lib/supabase/server'
import { getUploadUrl } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { fileId, contentType } = await request.json() as { fileId: string; contentType: string }

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Generate key untuk thumbnail
    const ext = 'jpg'
    const thumbnailKey = `thumbnails/${user.id}/${fileId}/thumb.${ext}`
    const uploadUrl = await getUploadUrl(thumbnailKey)

    return NextResponse.json({ uploadUrl, thumbnailKey })
  } catch (err: any) {
    console.error("[Upload Thumbnail URL] Error:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
