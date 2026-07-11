import { createClient } from '@/lib/supabase/server'
import { getUploadUrl } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { sanitizeFilename } from '@/lib/utils/security'
import { detectCategory } from '@/lib/utils/category'
import { getAuthorizedGoogleClientAndAuth } from '@/lib/gdrive'

const CATEGORY_SUBFOLDERS: Record<string, string> = {
  photo: 'Photos',
  video: 'Videos',
  audio: 'Audio',
  document: 'Documents',
  archive: 'Archives',
  other: 'Others'
}

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
      // Dapatkan Google Drive client dan auth token
      let drive, oauth2Client
      try {
        const authData = await getAuthorizedGoogleClientAndAuth(user.id)
        drive = authData.drive
        oauth2Client = authData.oauth2Client
      } catch (authErr: any) {
        return NextResponse.json({ 
          error: 'Google Drive belum terhubung atau koneksi kedaluwarsa. Silakan hubungkan Google Drive di halaman Pengaturan terlebih dahulu.' 
        }, { status: 400 })
      }

      // 1. Cari atau buat folder induk "PersonalVault" di Google Drive user
      let mainFolderId = ''
      const listRes = await drive.files.list({
        q: "name = 'PersonalVault' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
        fields: 'files(id)',
        spaces: 'drive'
      })

      if (listRes.data.files && listRes.data.files.length > 0) {
        mainFolderId = listRes.data.files[0].id || ''
      } else {
        const folderMetadata = {
          name: 'PersonalVault',
          mimeType: 'application/vnd.google-apps.folder'
        }
        const folder = await drive.files.create({
          requestBody: folderMetadata,
          fields: 'id'
        })
        mainFolderId = folder.data.id || ''
      }

      // 2. Tentukan nama subfolder berdasarkan kategori file
      const subfolderName = CATEGORY_SUBFOLDERS[category] || 'Others'

      // 3. Cari atau buat subfolder kategori di dalam "PersonalVault"
      let targetFolderId = ''
      const subfolderListRes = await drive.files.list({
        q: `name = '${subfolderName}' and '${mainFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`,
        fields: 'files(id)',
        spaces: 'drive'
      })

      if (subfolderListRes.data.files && subfolderListRes.data.files.length > 0) {
        targetFolderId = subfolderListRes.data.files[0].id || ''
      } else {
        const subfolderMetadata = {
          name: subfolderName,
          mimeType: 'application/vnd.google-apps.folder',
          parents: [mainFolderId]
        }
        const subfolder = await drive.files.create({
          requestBody: subfolderMetadata,
          fields: 'id'
        })
        targetFolderId = subfolder.data.id || ''
      }

      // 4. Inisialisasi Resumable Upload dengan Google Drive API
      const authHeaders = await oauth2Client.getRequestHeaders()
      const originHeader = request.headers.get('origin')
      
      console.log('[Upload URL] Initializing GDrive resumable upload', {
        fileName: cleanName,
        contentType,
        fileSize,
        targetFolderId
      })
      
      const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&supportsAllDrives=true', {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json; charset=UTF-8',
          'X-Upload-Content-Type': contentType,
          ...(fileSize > 0 ? { 'X-Upload-Content-Length': fileSize.toString() } : {}),
          ...(originHeader ? { 'Origin': originHeader } : {})
        },
        body: JSON.stringify({
          name: cleanName,
          parents: targetFolderId ? [targetFolderId] : []
        })
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('[Upload URL] GDrive init failed:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 500)
        })
        throw new Error(`Gagal menginisialisasi sesi Google Drive (${response.status}): ${errorText.substring(0, 200)}`)
      }

      const uploadUrl = response.headers.get('location')
      if (!uploadUrl) {
        console.error('[Upload URL] No location header in GDrive response')
        throw new Error('Gagal mendapatkan session upload URL dari Google Drive')
      }
      
      console.log('[Upload URL] GDrive resumable session created successfully')

      return NextResponse.json({ 
        isGDrive: true, 
        fileName: cleanName,
        uploadUrl
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


