import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatFileSize, formatDate } from '@/lib/utils/format'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '@/lib/utils/category'
import Link from 'next/link'

type Props = {
  params: Promise<{ id: string }>
}

export default async function PublicSharePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Query metadata berkas. RLS memperbolehkan select jika is_public = true
  const { data: file, error } = await supabase
    .from('files')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !file || !file.is_public) {
    notFound()
  }

  let downloadUrl = '#'
  if (file.drive_file_id) {
    downloadUrl = `/api/gdrive/download?id=${file.drive_file_id}`
  } else if (file.r2_key) {
    const { data: storageData } = await supabase.storage
      .from('personalvault')
      .createSignedUrl(file.r2_key, 3600)
    downloadUrl = storageData?.signedUrl || '#'
  }

  const isImage = file.mime_type.startsWith('image/')
  const isVideo = file.mime_type.startsWith('video/')
  const isAudio = file.mime_type.startsWith('audio/')

  // Baca isi jika teks untuk pratinjau (maksimal 20KB)
  let textPreview = ''
  if (file.mime_type.startsWith('text/') && file.size < 20000) {
    try {
      const absoluteUrl = downloadUrl.startsWith('http')
        ? downloadUrl
        : `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'}${downloadUrl}`
      const textRes = await fetch(absoluteUrl)
      if (textRes.ok) {
        textPreview = await textRes.text()
      }
    } catch (e) {
      console.error('Gagal mengambil pratinjau teks:', e)
    }
  }

  return (
    <div className="min-h-screen w-screen bg-[#fafafa] text-[#111111] flex flex-col justify-between overflow-x-hidden font-sans">

      {/* Header */}
      <header className="h-16 border-b border-[#e5e5e5] bg-white flex items-center px-8 justify-between">
        <Link href="/login" className="text-sm text-[#737373] hover:text-[#111111] transition-colors">
          ← Kembali
        </Link>
        <Link
          href="/login"
          className="text-xs px-4 py-2 rounded bg-[#111111] text-white hover:bg-[#333333] transition-colors font-semibold"
        >
          Masuk ke Vault Anda
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 my-8">
        <div className="w-full max-w-2xl bg-white border border-[#e5e5e5] rounded p-6 md:p-8 space-y-6 shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f5f5f5] pb-6">
            <div className="flex items-start gap-4">
              <div className="w-14 h-14 rounded bg-[#f5f5f5] border border-[#e5e5e5] flex items-center justify-center text-2xl shrink-0">
                {CATEGORY_EMOJI[file.category as keyof typeof CATEGORY_EMOJI] || '□'}
              </div>
              <div className="space-y-1">
                <h1 className="text-lg font-bold leading-snug break-all text-[#111111] pr-4">{file.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#737373]">
                  <span>{CATEGORY_LABEL[file.category as keyof typeof CATEGORY_LABEL]}</span>
                  <span>·</span>
                  <span>{formatFileSize(file.size)}</span>
                  <span>·</span>
                  <span>Diunggah {formatDate(file.created_at)}</span>
                </div>
              </div>
            </div>

            <a
              href={downloadUrl}
              download={file.name}
              className="btn-primary flex items-center justify-center gap-2 py-2.5 px-5 text-sm shrink-0"
            >
              Unduh Berkas
            </a>
          </div>

          {/* Pratinjau Area */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[#a3a3a3]">Pratinjau</h3>

            <div className="bg-[#f5f5f5] border border-[#e5e5e5] rounded overflow-hidden flex items-center justify-center min-h-[200px] max-h-[450px] p-2">
              {isImage && (
                <img
                  src={downloadUrl}
                  alt={file.name}
                  className="max-w-full max-h-[400px] object-contain"
                />
              )}

              {isVideo && (
                <video
                  src={downloadUrl}
                  controls
                  className="max-w-full max-h-[400px]"
                />
              )}

              {isAudio && (
                <div className="w-full p-8 flex flex-col items-center gap-4">
                  <span className="text-4xl text-[#a3a3a3]">♪</span>
                  <audio src={downloadUrl} controls className="w-full max-w-md" />
                </div>
              )}

              {textPreview && (
                <pre className="w-full text-left p-4 overflow-auto font-mono text-xs text-[#525252] leading-relaxed max-h-[400px]">
                  {textPreview}
                </pre>
              )}

              {!isImage && !isVideo && !isAudio && !textPreview && (
                <div className="text-center p-8 space-y-2">
                  <span className="text-3xl block text-[#a3a3a3]">□</span>
                  <p className="text-sm font-medium text-[#525252]">Pratinjau tidak tersedia</p>
                  <p className="text-xs text-[#a3a3a3]">Silakan unduh berkas untuk melihat isinya.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-[#e5e5e5] bg-white flex items-center justify-center text-xs text-[#a3a3a3]">
        © {new Date().getFullYear()} Penyimpanan pribadi terenkripsi dan aman.
      </footer>
    </div>
  )
}
