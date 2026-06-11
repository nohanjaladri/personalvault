import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

// Fungsi untuk men-sanitasi nama file agar hanya memuat alfanumerik, spasi, dan dash/underscore
function sanitizeFilename(name: string): string {
  let baseName = name.replace(/\.[^/.]+$/, "") // Hapus ekstensi jika ada
  baseName = baseName.replace(/[^a-zA-Z0-9_\-\s]/g, '').trim()
  if (!baseName) baseName = 'untitled'
  return `${baseName}.txt`
}

// Fungsi untuk menyandikan (escape) HTML untuk mencegah Cross-Site Scripting (XSS)
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export async function GET() {
  const supabase = await createClient()
  
  // Mengambil berkas publik anonim (user_id IS NULL)
  const { data, error } = await supabase
    .from('files')
    .select('*')
    .is('user_id', null)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function POST(request: NextRequest) {
  try {
    const { title, content } = await request.json() as { title: string; content: string }

    if (!title || !content) {
      return NextResponse.json({ error: 'Judul dan isi catatan wajib diisi!' }, { status: 400 })
    }

    // 1. Sanitasi Nama File & Validasi
    const filename = sanitizeFilename(title)
    
    // 2. Sanitasi Konten & Batasi ukuran (maksimal 200KB atau ~200,000 karakter)
    if (content.length > 200000) {
      return NextResponse.json({ error: 'Isi file melebihi batas 200KB!' }, { status: 400 })
    }
    const cleanContent = escapeHtml(content)

    // 3. Konversi ke Buffer
    const buffer = Buffer.from(cleanContent, 'utf-8')
    const size = buffer.length

    // 4. Unggah ke Supabase Storage secara aman lewat Server Client
    const supabase = await createClient()
    const r2Key = `public/anonymous-${randomUUID()}.txt`
    
    const { error: uploadError } = await supabase.storage
      .from('personalvault')
      .upload(r2Key, buffer, {
        contentType: 'text/plain; charset=utf-8',
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      return NextResponse.json({ error: `Gagal menyimpan ke storage: ${uploadError.message}` }, { status: 500 })
    }

    // 5. Simpan metadata ke tabel files dengan user_id = null
    const { data: dbData, error: dbError } = await supabase
      .from('files')
      .insert({
        user_id: null, // Anonim
        name: filename,
        size,
        mime_type: 'text/plain',
        category: 'document',
        r2_key: r2Key,
        is_public: true
      })
      .select()
      .single()

    if (dbError) {
      // Hapus file di storage jika simpan metadata gagal untuk membersihkan sampah
      await supabase.storage.from('personalvault').remove([r2Key])
      return NextResponse.json({ error: `Gagal menyimpan metadata: ${dbError.message}` }, { status: 500 })
    }

    return NextResponse.json(dbData, { status: 201 })

  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: 'Gagal memproses unggahan publik.' }, { status: 500 })
  }
}
