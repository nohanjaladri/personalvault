import { createClient } from '@/lib/supabase/server'
import { getDownloadUrl } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  try {
    const { r2Key, driveFileId, isThumbnail } = await request.json()
    
    if (!r2Key && !driveFileId) {
      return NextResponse.json({ error: 'r2Key or driveFileId is required' }, { status: 400 })
    }

    if (driveFileId) {
      if (!user) {
        // Cek apakah berkas bertanda publik di database
        const { data: fileData } = await supabase
          .from('files')
          .select('is_public')
          .eq('drive_file_id', driveFileId)
          .single()
        
        if (!fileData?.is_public) {
          return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
        }
      }

      // Buat signed download URL internal yang mengarah ke stream controller Google Drive kita
      const internalUrl = `/api/gdrive/download?id=${driveFileId}${isThumbnail ? '&thumbnail=true' : ''}`
      return NextResponse.json({ url: internalUrl })
    }

    const isPublicPath = r2Key.startsWith('public/')
    let isAllowed = isPublicPath || !!user

    if (!isAllowed) {
      // Check database to see if the file is shared publicly
      const { data: fileData } = await supabase
        .from('files')
        .select('is_public')
        .eq('r2_key', r2Key)
        .single()
      
      if (fileData?.is_public) {
        isAllowed = true
      }
    }

    if (!isAllowed) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = await getDownloadUrl(r2Key, !!isThumbnail)
    return NextResponse.json({ url })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

