import { createClient } from '@/lib/supabase/server'
import { deleteStorageObject } from '@/lib/storage'
import { NextRequest, NextResponse } from 'next/server'
import { getAuthorizedGoogleClient } from '@/lib/gdrive'

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: file } = await supabase
    .from('files').select('r2_key, drive_file_id, user_id').eq('id', id).single()

  if (!file || file.user_id !== user.id)
    return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (file.drive_file_id) {
    try {
      const drive = await getAuthorizedGoogleClient(user.id)
      await drive.files.delete({ fileId: file.drive_file_id })
    } catch (err) {
      console.error('Gagal menghapus file dari Google Drive:', err)
    }
  } else if (file.r2_key) {
    try {
      await deleteStorageObject(file.r2_key)
    } catch (err) {
      console.error('Gagal menghapus file dari Supabase Storage:', err)
    }
  }

  await supabase.from('files').delete().eq('id', id)

  return new NextResponse(null, { status: 204 })
}


export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { data, error } = await supabase
    .from('files').update(body).eq('id', id).eq('user_id', user.id).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
