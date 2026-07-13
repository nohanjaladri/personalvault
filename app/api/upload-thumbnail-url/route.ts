import { createClient } from '@/lib/supabase/server'
import { getUploadUrl, BUCKET } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

export async function POST(request: NextRequest) {
  try {
    console.log('[Upload Thumbnail URL] Request received')
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('[Upload Thumbnail URL] Auth check:', { user: !!user, authError })
    
    if (!user) {
      console.log('[Upload Thumbnail URL] Unauthorized')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { fileId, contentType } = await request.json() as { fileId: string; contentType: string }
    console.log('[Upload Thumbnail URL] Request data:', { fileId, contentType })

    if (!fileId) {
      console.log('[Upload Thumbnail URL] Missing fileId')
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 })
    }

    // Verify file exists and belongs to user
    console.log('[Upload Thumbnail URL] Verifying file ownership:', fileId)
    const { data: fileData, error: fetchError } = await supabase
      .from('files')
      .select('id')
      .eq('id', fileId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !fileData) {
      console.error('[Upload Thumbnail URL] File verification failed:', fetchError)
      return NextResponse.json({ error: 'File not found or unauthorized' }, { status: 404 })
    }

    // Generate key untuk thumbnail
    const ext = 'jpg'
    const thumbnailKey = `thumbnails/${user.id}/${fileId}/thumb.${ext}`
    console.log('[Upload Thumbnail URL] Generated key:', thumbnailKey)
    
    try {
      console.log('[Upload Thumbnail URL] Requesting signed upload URL for bucket:', BUCKET)
      const uploadUrl = await getUploadUrl(thumbnailKey)
      console.log('[Upload Thumbnail URL] Got upload URL:', uploadUrl.substring(0, 80))
      return NextResponse.json({ uploadUrl, thumbnailKey })
    } catch (storageErr: any) {
      console.error('[Upload Thumbnail URL] Storage error:', storageErr)
      return NextResponse.json({ 
        error: `Storage error: ${storageErr.message || 'Failed to generate upload URL'}` 
      }, { status: 500 })
    }
  } catch (err: any) {
    console.error("[Upload Thumbnail URL] Unexpected error:", err)
    return NextResponse.json({ 
      error: err.message || 'Internal server error', 
      details: process.env.NODE_ENV === 'development' ? err.stack : undefined 
    }, { status: 500 })
  }
}
