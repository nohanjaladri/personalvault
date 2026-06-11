'use client'
import { useState } from 'react'
import { useToast } from './Toast'

type Props = {
  isOpen: boolean
  onClose: () => void
  onUploadComplete: () => void
}

const FORMATS = [
  { label: 'Text File (.txt)', ext: '.txt', mime: 'text/plain' },
  { label: 'JavaScript (.js)', ext: '.js', mime: 'application/javascript' },
  { label: 'HTML (.html)', ext: '.html', mime: 'text/html' },
  { label: 'CSS (.css)', ext: '.css', mime: 'text/css' },
  { label: 'Markdown (.md)', ext: '.md', mime: 'text/markdown' },
  { label: 'JSON (.json)', ext: '.json', mime: 'application/json' },
]

export default function CreateNoteModal({ isOpen, onClose, onUploadComplete }: Props) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [formatIndex, setFormatIndex] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const { showToast } = useToast()

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      showToast('Judul tidak boleh kosong ⚠️')
      return
    }

    setUploading(true)
    setProgress(10)

    const selectedFormat = FORMATS[formatIndex]
    let filename = title.trim()
    if (!filename.toLowerCase().endsWith(selectedFormat.ext)) {
      filename += selectedFormat.ext
    }

    const file = new File([content], filename, { type: selectedFormat.mime })

    try {
      // 1. Get signed upload URL
      setProgress(30)
      const urlRes = await fetch('/api/upload-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, contentType: file.type }),
      })

      if (!urlRes.ok) {
        showToast('Gagal mendapatkan upload URL ❌')
        setUploading(false)
        return
      }

      const { uploadUrl, r2Key } = await urlRes.json()
      setProgress(50)

      // 2. Upload file to Supabase Storage
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      })

      if (!uploadRes.ok) {
        showToast('Gagal mengunggah file ke storage ❌')
        setUploading(false)
        return
      }

      setProgress(80)

      // 3. Save metadata in DB
      const metaRes = await fetch('/api/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: file.name,
          size: file.size,
          mimeType: file.type,
          r2Key,
        }),
      })

      if (!metaRes.ok) {
        showToast('Gagal menyimpan metadata berkas ❌')
        setUploading(false)
        return
      }

      setProgress(100)
      showToast(`Catatan "${file.name}" berhasil disimpan ✨`)
      
      window.dispatchEvent(new CustomEvent('session-file-uploaded', { 
        detail: { name: file.name, size: file.size, mimeType: file.type } 
      }))

      // Reset form
      setTitle('')
      setContent('')
      setFormatIndex(0)
      
      setTimeout(() => {
        setUploading(false)
        setProgress(0)
        onClose()
        onUploadComplete()
      }, 600)

    } catch (err: any) {
      console.error(err)
      showToast('Terjadi kesalahan saat menyimpan ❌')
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg glass-card p-6 space-y-4 shadow-2xl border border-white/10 rounded-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <span>📝</span> Buat Catatan / Kode Baru
          </h2>
          <button 
            onClick={onClose} 
            className="text-slate-400 hover:text-slate-100 transition-colors text-xl font-bold"
            disabled={uploading}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Judul (Nama File)</label>
            <input
              type="text"
              required
              disabled={uploading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: catatan-rapat, script-helper"
              className="input-field w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-slate-400 block mb-1.5">Format Penyimpanan</label>
              <select
                disabled={uploading}
                value={formatIndex}
                onChange={(e) => setFormatIndex(Number(e.target.value))}
                className="input-field w-full cursor-pointer bg-slate-900 text-slate-200"
              >
                {FORMATS.map((format, idx) => (
                  <option key={format.ext} value={idx}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-[10px] text-slate-500 leading-normal mb-1">
                *Ekstensi file otomatis ditambahkan di akhir nama jika belum ada.
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Isi Catatan / Kode</label>
            <textarea
              required
              disabled={uploading}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik catatan, paste tautan (link), atau tempelkan kode Anda di sini..."
              rows={8}
              className="input-field w-full font-mono text-sm leading-relaxed"
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Sedang menyimpan...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(139,92,246,0.6)]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={uploading}
              className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary px-5 py-2 text-sm"
            >
              Simpan ke Vault
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
