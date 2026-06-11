import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizedGoogleClient } from '@/lib/gdrive'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const isThumbnail = searchParams.get('thumbnail') === 'true'

  if (!id) {
    return NextResponse.json({ error: 'Google Drive File ID is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Verifikasi hak akses (apakah user log-in memiliki berkas ini atau berkas bersifat publik)
  const { data: fileMeta, error: dbErr } = await supabase
    .from('files')
    .select('user_id, is_public, mime_type')
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

    // 3. Mengunduh data dari Google Drive API
    // Jika isThumbnail = true, ambil thumbnailLink atau gunakan download media
    const fileRes = await drive.files.get(
      { fileId: id, alt: 'media' },
      { responseType: 'stream' }
    )

    // 4. Salurkan stream data secara langsung ke klien browser
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
