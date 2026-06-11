import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatFileSize, formatDate } from '@/lib/utils/format'
import { CATEGORY_EMOJI, CATEGORY_LABEL } from '@/lib/utils/category'
import ShapeCanvas from '@/components/ShapeCanvas'
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
    // Hasilkan download URL (Signed URL dari Supabase Storage selama 1 jam)
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
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden relative font-sans">
      <ShapeCanvas />
      
      {/* Header */}
      <header className="h-16 border-b border-white/[0.06] flex items-center px-8 justify-between relative z-10">
        <Link href="/login" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
          <span className="text-xl">🔒</span>
          <span className="font-bold tracking-tight bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            PersonalVault
          </span>
        </Link>
        <Link 
          href="/login" 
          className="text-xs px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/[0.09] hover:bg-white/10 hover:border-white/20 transition-all font-semibold"
        >
          Masuk ke Vault Anda
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 my-8">
        <div className="w-full max-w-2xl glass-card p-6 md:p-8 space-y-6 shadow-2xl border border-white/10 rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-violet-500/30 flex items-center justify-center text-3xl shadow-[0_0_20px_rgba(139,92,246,0.15)] shrink-0">
                {CATEGORY_EMOJI[file.category as keyof typeof CATEGORY_EMOJI] || '📎'}
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-bold leading-snug break-all text-slate-100 pr-4">{file.name}</h1>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                  <span>{CATEGORY_LABEL[file.category as keyof typeof CATEGORY_LABEL]}</span>
                  <span>•</span>
                  <span>{formatFileSize(file.size)}</span>
                  <span>•</span>
                  <span>Diunggah {formatDate(file.created_at)}</span>
                </div>
              </div>
            </div>
            
            <a 
              href={downloadUrl} 
              download={file.name}
              className="btn-primary flex items-center justify-center gap-2 py-3 px-6 rounded-xl font-semibold shadow-[0_0_24px_rgba(139,92,246,0.4)] hover:scale-[1.02] transition-transform text-sm shrink-0"
            >
              📥 Unduh Berkas
            </a>
          </div>

          {/* Pratinjau Area */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-slate-500">Pratinjau Berkas</h3>
            
            <div className="bg-black/35 rounded-xl border border-white/[0.05] overflow-hidden flex items-center justify-center min-h-[200px] max-h-[450px] p-2 relative">
              {isImage && (
                <img 
                  src={downloadUrl} 
                  alt={file.name} 
                  className="max-w-full max-h-[400px] object-contain rounded-lg shadow-lg"
                />
              )}

              {isVideo && (
                <video 
                  src={downloadUrl} 
                  controls 
                  className="max-w-full max-h-[400px] rounded-lg shadow-lg"
                />
              )}

              {isAudio && (
                <div className="w-full p-8 flex flex-col items-center gap-4">
                  <span className="text-5xl animate-bounce">🎵</span>
                  <audio src={downloadUrl} controls className="w-full max-w-md" />
                </div>
              )}

              {textPreview && (
                <pre className="w-full text-left p-4 overflow-auto font-mono text-xs text-slate-300 leading-relaxed bg-slate-950/40 rounded-lg max-h-[400px] scrollbar-thin">
                  {textPreview}
                </pre>
              )}

              {!isImage && !isVideo && !isAudio && !textPreview && (
                <div className="text-center p-8 space-y-2">
                  <span className="text-4xl block">📦</span>
                  <p className="text-sm font-medium text-slate-300">Pratinjau tidak didukung untuk tipe file ini</p>
                  <p className="text-xs text-slate-500">Silakan unduh berkas untuk melihat isinya.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-white/[0.06] flex items-center justify-center text-xs text-slate-600 relative z-10">
        © {new Date().getFullYear()} PersonalVault. Penyimpanan pribadi terenkripsi dan aman.
      </footer>
    </div>
  )
}
