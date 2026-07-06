'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import ShapeCanvas from '@/components/ShapeCanvas'
import { useToast } from '@/components/Toast'
import { formatFileSize, formatDate } from '@/lib/utils/format'

type PublicFile = {
  id: string
  name: string
  size: number
  mime_type: string
  created_at: string
  r2_key: string
}

export default function PublicVaultPage() {
  const [files, setFiles] = useState<PublicFile[]>([])
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [uploading, setUploading] = useState(false)
  
  // States for viewing file content
  const [selectedFile, setSelectedFile] = useState<PublicFile | null>(null)
  const [fileContent, setFileContent] = useState('')
  const [loadingContent, setLoadingContent] = useState(false)

  const router = useRouter()
  const { showToast } = useToast()

  const fetchPublicFiles = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/public-files')
      if (res.ok) {
        const data = await res.json()
        setFiles(data)
      } else {
        showToast('Gagal memuat daftar berkas publik ❌')
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPublicFiles()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !content.trim()) {
      showToast('Judul dan isi berkas wajib diisi! ⚠️')
      return
    }

    setUploading(true)
    try {
      const res = await fetch('/api/public-files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content }),
      })

      if (res.ok) {
        showToast('Catatan publik berhasil disimpan! 🌐')
        setTitle('')
        setContent('')
        fetchPublicFiles()
      } else {
        const errData = await res.json()
        showToast(errData.error || 'Gagal menyimpan catatan ❌')
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan koneksi ❌')
    } finally {
      setUploading(false)
    }
  }

  const handleViewFile = async (file: PublicFile) => {
    setSelectedFile(file)
    setLoadingContent(true)
    setFileContent('')

    try {
      // Dapatkan signed URL sementara dari API download-url
      const urlRes = await fetch('/api/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Key: file.r2_key }),
      })

      if (urlRes.ok) {
        const { url } = await urlRes.json()
        const contentRes = await fetch(url)
        if (contentRes.ok) {
          const text = await contentRes.text()
          // Hapus escape HTML agar terbaca normal (karena kita menyimpannya dengan escapeHtml)
          const unescaped = text
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
          setFileContent(unescaped)
        } else {
          setFileContent('Gagal memuat isi file dari storage.')
        }
      } else {
        setFileContent('Gagal menghasilkan link download.')
      }
    } catch (err) {
      console.error(err)
      setFileContent('Kesalahan koneksi saat mengambil isi file.')
    } finally {
      setLoadingContent(false)
    }
  }

  return (
    <div className="min-h-screen w-screen bg-slate-950 text-slate-100 flex flex-col justify-between overflow-x-hidden relative font-sans">
      <ShapeCanvas />

      {/* Header */}
      <header className="h-16 border-b border-white/[0.06] flex items-center px-8 justify-between relative z-10">
        <div className="flex items-center gap-2.5">
          <span className="text-xl">🌐</span>
          <span className="font-bold tracking-tight bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
            PublicVault
          </span>
        </div>
        <button
          onClick={() => router.push('/login')}
          className="text-xs px-3.5 py-1.5 rounded-xl bg-white/5 border border-white/[0.09] hover:bg-white/10 hover:border-white/20 transition-all font-semibold cursor-pointer"
        >
          ← Kembali ke Login
        </button>
      </header>

      {/* Main Grid */}
      <main className="flex-1 max-w-6xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 p-6 relative z-10 my-4">
        
        {/* Form Column - Left */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card p-6 border border-white/10 rounded-2xl shadow-xl space-y-4">
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <span>📝</span> Buat File Teks Publik
            </h2>
            <p className="text-xs text-slate-500">
              Bagikan kode, catatan, atau tautan secara anonim. Hanya menerima tulisan/teks polos. Maksimal ukuran 200KB.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Judul Catatan</label>
                <input
                  type="text"
                  required
                  disabled={uploading}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Contoh: catatan-pemrograman, link-terbaru"
                  className="input-field w-full text-sm"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Isi Catatan</label>
                <textarea
                  required
                  disabled={uploading}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Tulis teks, tempel kode pemrograman, atau link Anda di sini..."
                  rows={10}
                  className="input-field w-full font-mono text-xs leading-relaxed"
                />
              </div>

              <button
                type="submit"
                disabled={uploading}
                className="btn-primary w-full py-2.5 text-sm font-semibold cursor-pointer"
              >
                {uploading ? 'Mengunggah...' : 'Bagikan ke Publik'}
              </button>
            </form>
          </div>
        </div>

        {/* List Column - Right */}
        <div className="lg:col-span-7 space-y-4">
          <div className="glass-card p-6 border border-white/10 rounded-2xl shadow-xl flex flex-col h-full min-h-[500px]">
            <h2 className="text-lg font-bold text-slate-100 flex items-center justify-between border-b border-white/10 pb-4 mb-4">
              <span>📂 File Teks Publik Terbaru</span>
              <span className="text-xs font-normal text-slate-400">{files.length} file</span>
            </h2>

            {loading ? (
              <div className="flex-1 space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div 
                    key={i}
                    className="p-3.5 rounded-xl border border-white/5 bg-white/[0.01] flex items-center justify-between relative overflow-hidden"
                  >
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="w-[200%] h-full -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/[0.03] to-transparent" />
                    </div>
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-8 h-8 rounded-lg bg-white/[0.03]" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="h-4 w-1/3 bg-white/5 rounded-md" />
                        <div className="h-3 w-1/6 bg-white/[0.03] rounded-md mt-1.5" />
                      </div>
                    </div>
                    <div className="h-4 w-12 bg-white/[0.03] rounded-md ml-4" />
                  </div>
                ))}
              </div>
            ) : files.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-2 text-slate-500">
                <span className="text-4xl">📭</span>
                <p className="text-sm font-medium">Belum ada file publik.</p>
                <p className="text-xs">Jadilah yang pertama mengunggah catatan publik!</p>
              </div>
            ) : (
              <div className="flex-grow overflow-y-auto space-y-2 max-h-[550px] pr-2 scrollbar-thin">
                {files.map(file => (
                  <div 
                    key={file.id}
                    onClick={() => handleViewFile(file)}
                    className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition-all flex items-center justify-between cursor-pointer group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl">📄</span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-200 group-hover:text-violet-400 transition-colors truncate">
                          {file.name}
                        </div>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          {formatDate(file.created_at)}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs text-slate-500 shrink-0 font-medium ml-4">
                      {formatFileSize(file.size)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Viewer Modal */}
      {selectedFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-2xl glass-card p-6 border border-white/10 rounded-2xl space-y-4 shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="min-w-0 pr-4">
                <h3 className="text-md font-bold text-slate-100 truncate">{selectedFile.name}</h3>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Diunggah {formatDate(selectedFile.created_at)} • {formatFileSize(selectedFile.size)}
                </p>
              </div>
              <button 
                onClick={() => setSelectedFile(null)}
                className="text-slate-400 hover:text-slate-100 transition-colors text-2xl font-bold"
              >
                &times;
              </button>
            </div>

            <div className="flex-1 bg-black/40 border border-white/[0.05] rounded-xl overflow-y-auto p-4 max-h-[50vh] scrollbar-thin">
              {loadingContent ? (
                <div className="h-32 flex items-center justify-center text-sm text-slate-500 animate-pulse">
                  Mengambil isi berkas...
                </div>
              ) : (
                <pre className="font-mono text-xs text-slate-300 leading-relaxed whitespace-pre-wrap break-all">
                  {fileContent}
                </pre>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedFile(null)}
                className="px-5 py-2 text-sm font-semibold rounded-xl bg-white/5 border border-white/[0.09] hover:bg-white/10 transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="h-14 border-t border-white/[0.06] flex items-center justify-center text-xs text-slate-600 relative z-10">
        © {new Date().getFullYear()} Public Vault. Tempat berbagi teks anonim yang aman.
      </footer>
    </div>
  )
}
