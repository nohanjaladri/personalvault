import { createClient } from '@/lib/supabase/server'
import { detectCategory } from '@/lib/utils/category'
import { NextRequest, NextResponse } from 'next/server'
import { sanitizeFilename } from '@/lib/utils/security'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const category = searchParams.get('category')
  const q = searchParams.get('q')
  const sort = (searchParams.get('sort') ?? 'created_at') as 'created_at' | 'size' | 'name'
  const asc = searchParams.get('order') === 'asc'

  let query = supabase.from('files').select('*').eq('user_id', user.id).order(sort, { ascending: asc })
  if (category) query = query.eq('category', category)
  if (q) query = query.ilike('name', `%${q}%`)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { name, size, mimeType, r2Key, folderId, driveFileId } = await request.json()
    const cleanName = sanitizeFilename(name)
    const category = detectCategory(mimeType)

    // Jika r2Key kosong (karena disimpan di Google Drive), gunakan dummy key unik untuk memenuhi not-null constraint database
    const dbR2Key = r2Key || `gdrive/${driveFileId || crypto.randomUUID()}`

    const { data, error } = await supabase
      .from('files')
      .insert({ 
        user_id: user.id, 
        name: cleanName, 
        size, 
        mime_type: mimeType, 
        category, 
        r2_key: dbR2Key, 
        drive_file_id: driveFileId ?? null,
        folder_id: folderId ?? null 
      })
      .select()
      .single()

    if (error) {
      console.error("SUPABASE FILES INSERT ERROR:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    console.error("POST /api/files catch block error:", err)
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
