'use client'
import { useCallback, useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CategoryCards from '@/components/CategoryCards'
import FileGrid from '@/components/FileGrid'
import DropZone from '@/components/DropZone'
import { formatFileSize } from '@/lib/utils/format'
import { useToast } from '@/components/Toast'

type FileRow = { id: string; name: string; size: number; category: string; mime_type: string; created_at: string; is_starred: boolean; is_public?: boolean }
type SessionUpload = { name: string; size: number; mimeType: string }

const FORMATS = [
  { label: 'File Teks (.txt)', ext: '.txt', mime: 'text/plain' },
  { label: 'JavaScript (.js)', ext: '.js', mime: 'application/javascript' },
  { label: 'HTML (.html)', ext: '.html', mime: 'text/html' },
  { label: 'CSS (.css)', ext: '.css', mime: 'text/css' },
  { label: 'Markdown (.md)', ext: '.md', mime: 'text/markdown' },
  { label: 'JSON (.json)', ext: '.json', mime: 'application/json' },
]

export default function DashboardPage() {
  const [files, setFiles] = useState<FileRow[]>([])
  const [loading, setLoading] = useState(true)
  const [aalLevel, setAalLevel] = useState<'aal1' | 'aal2' | null>(null)
  
  // Note Form States (AAL1 Inline)
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteFormatIdx, setNoteFormatIdx] = useState(0)
  const [noteUploading, setNoteUploading] = useState(false)
  const [noteProgress, setNoteProgress] = useState(0)

  // Track files uploaded in the current browser session (for AAL1 Upload-Only view)
  const [sessionUploads, setSessionUploads] = useState<SessionUpload[]>([])
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const q = searchParams.get('q') ?? ''

  const checkAAL = useCallback(async () => {
    const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
    setAalLevel((data?.currentLevel as 'aal1' | 'aal2') ?? 'aal1')
  }, [supabase])

  const fetchFiles = useCallback(async () => {
    if (aalLevel !== 'aal2') {
      setLoading(false)
      return
    }
    setLoading(true)
    const url = q ? `/api/files?q=${encodeURIComponent(q)}` : '/api/files'
    const res = await fetch(url)
    const data = await res.json()
    setFiles(data)
    setLoading(false)
  }, [q, aalLevel])

  useEffect(() => {
    checkAAL()
  }, [checkAAL])

  useEffect(() => {
    if (aalLevel) {
      fetchFiles()
    }
  }, [aalLevel, fetchFiles])

  // Listen for refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchFiles()
    }
    window.addEventListener('refresh-files', handleRefresh)
    return () => window.removeEventListener('refresh-files', handleRefresh)
  }, [fetchFiles])

  // Listen for session upload events
  useEffect(() => {
    const handleSessionUpload = (e: Event) => {
      const customEvent = e as CustomEvent
      setSessionUploads(prev => [customEvent.detail, ...prev])
    }
    window.addEventListener('session-file-uploaded', handleSessionUpload)
    return () => window.removeEventListener('session-file-uploaded', handleSessionUpload)
  }, [])

  const categoryStats = ['photo','video','audio','code','document','archive','other'].map(cat => ({
    category: cat,
    count: files.filter(f => f.category === cat).length,
    totalSize: files.filter(f => f.category === cat).reduce((s, f) => s + f.size, 0),
  }))

  const handleUploadComplete = () => {
    if (aalLevel === 'aal2') {
      fetchFiles()
    }
  }

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!noteTitle.trim()) {
      showToast('Judul catatan tidak boleh kosong ⚠️')
      return
    }

    setNoteUploading(true)
    setNoteProgress(15)

    const selectedFormat = FORMATS[noteFormatIdx]
    let filename = noteTitle.trim()
    if (!filename.toLowerCase().endsWith(selectedFormat.ext)) {
      filename += selectedFormat.ext
    }

    const file = new File([noteContent], filename, { type: selectedFormat.mime })

    try {
      setNoteProgress(40)
      const urlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      })

      if (!urlRes.ok) {
        const errData = await urlRes.json().catch(() => ({}))
        showToast(errData.error || 'Gagal memproses upload ke storage ❌')
        setNoteUploading(false)
        return
      }

      const { uploadUrl, r2Key, fileName: cleanName } = await urlRes.json()
      setNoteProgress(60)

      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        showToast('Gagal mengunggah isi catatan ❌')
        setNoteUploading(false)
        return
      }

      setNoteProgress(85)
      const metaRes = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: cleanName || file.name,
          size: file.size,
          mimeType: file.type,
          r2Key,
        }),
      })

      if (!metaRes.ok) {
        showToast('Gagal menyimpan metadata catatan ❌')
        setNoteUploading(false)
        return
      }

      setNoteProgress(100)
      showToast(`Catatan "${cleanName || file.name}" disimpan ke Vault ✨`)

      window.dispatchEvent(new CustomEvent('session-file-uploaded', { 
        detail: { name: cleanName || file.name, size: file.size, mimeType: file.type } 
      }))

      setNoteTitle('')
      setNoteContent('')
      setNoteFormatIdx(0)

      setTimeout(() => {
        setNoteUploading(false)
        setNoteProgress(0)
      }, 600)

    } catch (err) {
      console.error(err)
      showToast('Gagal mengunggah catatan ❌')
      setNoteUploading(false)
    }
  }

  if (aalLevel === null) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl text-violet-400 animate-spin">⏳</div>
        <p className="text-sm text-slate-500 animate-pulse">Memverifikasi tingkat keamanan...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {aalLevel === 'aal1' ? (
        // ================= TAMPILAN PERTAMA: UPLOAD ONLY (AAL1) =================
        <div className="space-y-6 pb-12">
          {/* Header Status */}
          <div className="p-4 bg-amber-500/5 border border-amber-500/15 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-lg">
            <div className="space-y-1">
              <h1 className="text-md font-bold text-slate-200 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse"></span>
                Mode Aman Aktif: Khusus Upload & Tulis
              </h1>
              <p className="text-xs text-slate-400">Berkas dan catatan yang Anda unggah langsung terenkripsi dan tersimpan dengan aman.</p>
            </div>
            <span className="self-start md:self-auto text-xs px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 font-semibold border border-amber-500/20 shadow-inner">
              AAL1 (Low Security)
            </span>
          </div>

          {/* Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: DropZone & Note Form */}
            <div className="lg:col-span-7 space-y-6">
              {/* DropZone Card */}
              <div className="glass-card p-6 border border-white/10 shadow-xl rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <span>📥</span> Unggah Berkas Baru
                </h3>
                <DropZone onUploadComplete={handleUploadComplete} />
              </div>

              {/* Inline Note Form Card */}
              <div className="glass-card p-6 border border-white/10 shadow-xl rounded-2xl relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
                  <span>📝</span> Tulis Catatan & Kode Baru
                </h3>

                <form onSubmit={handleSaveNote} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">Judul (Nama File)</label>
                      <input
                        type="text"
                        required
                        disabled={noteUploading}
                        value={noteTitle}
                        onChange={(e) => setNoteTitle(e.target.value)}
                        placeholder="catatan-rapat, script-helper"
                        className="input-field text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-400 block mb-1.5">Format File</label>
                      <select
                        disabled={noteUploading}
                        value={noteFormatIdx}
                        onChange={(e) => setNoteFormatIdx(Number(e.target.value))}
                        className="input-field cursor-pointer bg-slate-950 text-slate-300 border border-white/10 rounded-xl"
                      >
                        {FORMATS.map((format, idx) => (
                          <option key={format.ext} value={idx}>
                            {format.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-400 block mb-1.5">Isi Catatan / Kode</label>
                    <textarea
                      required
                      disabled={noteUploading}
                      value={noteContent}
                      onChange={(e) => setNoteContent(e.target.value)}
                      placeholder="Tulis catatan, tempel tautan (link), atau ketik baris kode Anda di sini..."
                      rows={6}
                      className="input-field font-mono text-xs leading-relaxed"
                    />
                  </div>

                  {noteUploading && (
                    <div className="space-y-1">
                      <div className="flex justify-between text-[10px] text-slate-400">
                        <span>Menyimpan ke Vault...</span>
                        <span>{noteProgress}%</span>
                      </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-300"
                          style={{ width: `${noteProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={noteUploading}
                    className="btn-primary w-full py-2.5 text-sm font-semibold cursor-pointer shadow-md hover:shadow-violet-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {noteUploading ? 'Menyimpan...' : '💾 Simpan Catatan ke Vault'}
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: 2FA Lock Card & Session History */}
            <div className="lg:col-span-5 space-y-6">
              {/* Lock Card */}
              <div className="glass-card p-6 border border-violet-500/20 bg-gradient-to-br from-slate-950 to-violet-950/20 shadow-2xl rounded-2xl text-center space-y-4 relative overflow-hidden group">
                <div className="absolute inset-0 bg-violet-500/[0.02] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-3xl mx-auto mb-2 text-violet-400 shadow-[0_0_20px_rgba(139,92,246,0.15)] animate-pulse">
                  🔒
                </div>
                <div className="space-y-1">
                  <h3 className="text-md font-bold text-slate-100">Brankas Utama Terkunci</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
                    Untuk membuka kunci brankas, melihat daftar file lama, mencari, atau mengunduh data, Anda perlu memverifikasi Authenticator (2FA) Anda.
                  </p>
                </div>
                <button
                  onClick={() => router.push('/verify')}
                  className="btn-primary w-full py-2.5 text-sm font-semibold cursor-pointer shadow-lg hover:shadow-violet-500/20 transition-all duration-300"
                >
                  🔓 Buka Brankas Utama (2FA)
                </button>
              </div>

              {/* Session History Log */}
              <div className="glass-card p-6 border border-white/10 shadow-xl rounded-2xl flex flex-col min-h-[220px]">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-white/10 pb-3 mb-3 flex justify-between items-center">
                  <span>Unggahan Sesi Ini</span>
                  <span className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded-full font-normal">
                    {sessionUploads.length} file
                  </span>
                </h3>

                {sessionUploads.length === 0 ? (
                  <div className="flex-1 flex items-center justify-center text-center p-6 text-xs text-slate-500 italic">
                    Belum ada unggahan di sesi browser ini.
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin">
                    {sessionUploads.map((file, index) => (
                      <div 
                        key={index}
                        className="p-2.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between text-xs animate-fade-in"
                      >
                        <div className="flex items-center gap-2.5 min-w-0 pr-2">
                          <span className="text-xs text-violet-400">✓</span>
                          <div className="truncate font-medium text-slate-300">{file.name}</div>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 font-medium">
                          {formatFileSize(file.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        // ================= TAMPILAN KEDUA: FULL VAULT ACCESS (AAL2) =================
        <div className="space-y-6">
          <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
            <div className="space-y-0.5">
              <h1 className="text-md font-bold text-slate-200 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                Brankas Utama Terbuka (Akses Penuh)
              </h1>
              <p className="text-xs text-slate-500">Anda berada dalam mode modifikasi berkas dengan tingkat keamanan penuh.</p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 font-semibold border border-emerald-500/20">
              AAL2 (High Security)
            </span>
          </div>

          <DropZone onUploadComplete={handleUploadComplete} />

          {!q && (
            <>
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mb-3.5">Kategori</p>
              <CategoryCards stats={categoryStats} />
            </>
          )}

          <div className="flex items-center justify-between mb-3.5 mt-8">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-600">
              {q ? `Hasil pencarian "${q}"` : 'File Terbaru'}
            </p>
            <span className="text-xs text-slate-600">{files.length} file</span>
          </div>

          {loading ? (
            <div className="text-center py-12 text-slate-500 text-sm animate-pulse">Memuat berkas...</div>
          ) : (
            <FileGrid files={files} onRefresh={fetchFiles} />
          )}
        </div>
      )}
    </div>
  )
}
