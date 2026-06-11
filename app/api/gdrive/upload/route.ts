import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthorizedGoogleClient } from '@/lib/gdrive'
import { Readable } from 'stream'
import { detectCategory } from '@/lib/utils/category'

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
    const contentType = request.headers.get('content-type') || 'application/octet-stream'
    const fileName = request.headers.get('x-file-name') || 'unnamed-file'
    const cleanName = decodeURIComponent(fileName)

    const drive = await getAuthorizedGoogleClient(user.id)

    // Dapatkan data array buffer file dari body request
    const buffer = await request.arrayBuffer()
    const bufferStream = new Readable()
    bufferStream.push(Buffer.from(buffer))
    bufferStream.push(null)

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
    const category = detectCategory(contentType)
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

    // 4. Unggah file ke Google Drive (di dalam subfolder kategori)
    const fileMetadata = {
      name: cleanName,
      parents: targetFolderId ? [targetFolderId] : []
    }
    const media = {
      mimeType: contentType,
      body: bufferStream
    }

    const driveFile = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    })

    const driveFileId = driveFile.data.id

    return NextResponse.json({ driveFileId, fileName: cleanName, folderId: targetFolderId })
  } catch (err: any) {
    console.error('Gagal mengunggah file ke Google Drive:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

