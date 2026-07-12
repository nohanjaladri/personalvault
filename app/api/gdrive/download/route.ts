import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizedGoogleClient } from '@/lib/gdrive'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const isThumbnail = searchParams.get('thumbnail') === 'true'
  const isVideoThumbnail = searchParams.get('videoThumbnail') === 'true'

  if (!id) {
    return NextResponse.json({ error: 'Google Drive File ID is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Verifikasi hak akses (apakah user log-in memiliki berkas ini atau berkas bersifat publik)
  const { data: fileMeta, error: dbErr } = await supabase
    .from('files')
    .select('user_id, is_public, mime_type, thumbnail_key')
    .eq('drive_file_id', id)
    .maybeSingle()

  if (dbErr || !fileMeta) {
    return NextResponse.json({ error: 'File not found' }, { status: 404 })
  }

  const isAllowed = fileMeta.is_public || (user && user.id === fileMeta.user_id)
  if (!isAllowed) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 2. Ambil client gdrive untuk pemilik berkas (fileMeta.user_id)
    const drive = await getAuthorizedGoogleClient(fileMeta.user_id)

    // 3. Jika isVideoThumbnail dan ada thumbnail_key, ambil thumbnail dari R2
    if (isVideoThumbnail && fileMeta.thumbnail_key) {
      const thumbnailUrl = `/api/download-url`
      // Return redirect ke thumbnail URL
      const { data: thumbData } = await supabase.storage
        .from('personalvault')
        .createSignedUrl(fileMeta.thumbnail_key, 900)
      
      if (thumbData?.signedUrl) {
        return NextResponse.redirect(thumbData.signedUrl)
      }
    }

    // 4. Jika isVideoThumbnail tanpa thumbnail_key, coba ambil thumbnail dari Drive API
    if (isVideoThumbnail) {
      try {
        const fileMetadata = await drive.files.get({
          fileId: id,
          fields: 'thumbnailLink'
        })
        
        if (fileMetadata.data.thumbnailLink) {
          // Fetch thumbnail dari Google's thumbnail service
          const thumbRes = await fetch(fileMetadata.data.thumbnailLink)
          const thumbBuffer = await thumbRes.arrayBuffer()
          
          const headers = new Headers()
          headers.set('Content-Type', 'image/jpeg')
          headers.set('Cache-Control', 'private, max-age=86400')
          
          return new NextResponse(thumbBuffer, {
            status: 200,
            headers
          })
        }
      } catch (thumbErr) {
        console.error('[GDrive] Failed to get thumbnailLink:', thumbErr)
        // Fallback: Return empty transparent 1x1 GIF
        const emptyGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
        return new NextResponse(emptyGif, {
          status: 200,
          headers: {
            'Content-Type': 'image/gif',
            'Cache-Control': 'public, max-age=86400'
          }
        })
      }
    }

    // 5. Mengunduh data dari Google Drive API
    // Jika isThumbnail = true, ambil thumbnailLink atau gunakan download media
    const fileRes = await drive.files.get(
      { fileId: id, alt: 'media' },
      { responseType: 'stream' }
    )

    // 6. Salurkan stream data secara langsung ke klien browser
    const headers = new Headers()
    headers.set('Content-Type', fileMeta.mime_type || 'application/octet-stream')
    headers.set('Cache-Control', 'private, max-age=86400') // Cache lokal aman selama 1 hari

    // @ts-ignore
    return new NextResponse(fileRes.data, {
      status: 200,
      headers
    })
  } catch (err: any) {
    console.error('Google Drive streaming download error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
