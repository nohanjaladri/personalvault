import { createClient } from '@/lib/supabase/server'
import { getUploadUrl } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { sanitizeFilename } from '@/lib/utils/security'
import { detectCategory } from '@/lib/utils/category'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { fileName, contentType, size } = await request.json() as { fileName: string; contentType: string; size?: number }
    if (!fileName || typeof fileName !== 'string') {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 })
    }

    const cleanName = sanitizeFilename(fileName)
    const fileSize = size ?? 0

    // Cek kategori file
    const category = detectCategory(contentType)
    const isGDrive = category !== 'code'

    if (isGDrive) {
      // Periksa apakah user telah mengoneksikan Google Drive
      const { data: gTokens } = await supabase
        .from('user_google_tokens')
        .select('user_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!gTokens) {
        return NextResponse.json({ 
          error: 'Google Drive belum terhubung. Silakan hubungkan Google Drive di halaman Pengaturan terlebih dahulu untuk mengunggah foto, dokumen, dan berkas lainnya.' 
        }, { status: 400 })
      }

      // Beri tahu klien bahwa file ini akan dialirkan langsung ke Google Drive
      return NextResponse.json({ 
        isGDrive: true, 
        fileName: cleanName,
        uploadUrl: '/api/gdrive/upload' // Endpoint internal untuk menerima stream file
      })
    }

    const ext = cleanName.includes('.') ? cleanName.split('.').pop() : ''
    const r2Key = `${user.id}/${randomUUID()}${ext ? `.${ext}` : ''}`
    const uploadUrl = await getUploadUrl(r2Key)

    return NextResponse.json({ uploadUrl, r2Key, fileName: cleanName, isGDrive: false })
  } catch (err: any) {
    console.error("Error generating signed upload URL:", err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}


