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
      showToast('Judul tidak boleh kosong')
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
        showToast('Gagal mendapatkan upload URL')
        setUploading(false)
        return
      }

      const { uploadUrl, r2Key } = await urlRes.json()
      setProgress(30)

      // 2. Upload file with XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 50) + 30
            setProgress(pct)
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error('Gagal mengunggah'))
        }
        xhr.onerror = () => reject(new Error('Koneksi bermasalah'))
        xhr.send(file)
      })

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
        showToast('Gagal menyimpan metadata berkas')
        setUploading(false)
        return
      }

      setProgress(100)
      showToast(`Catatan "${file.name}" berhasil disimpan`)

      window.dispatchEvent(new CustomEvent('session-file-uploaded', {
        detail: { name: file.name, size: file.size, mimeType: file.type }
      }))

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
      showToast('Terjadi kesalahan saat menyimpan')
      setUploading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-lg bg-[var(--surface)] border border-[var(--border)] rounded shadow-[0_8px_32px_rgba(0,0,0,0.25)] p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-[var(--border)] pb-4">
          <h2 className="text-base font-bold text-[var(--text-1)]">
            Buat Catatan / Kode Baru
          </h2>
          <button
            onClick={onClose}
            className="text-[var(--text-4)] hover:text-[var(--text-1)] transition-colors text-xl font-bold leading-none cursor-pointer"
            disabled={uploading}
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] block mb-2 uppercase tracking-wider">Judul (Nama File)</label>
            <input
              type="text"
              required
              disabled={uploading}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: catatan-rapat, script-helper"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-[var(--text-2)] block mb-2 uppercase tracking-wider">Format</label>
              <select
                disabled={uploading}
                value={formatIndex}
                onChange={(e) => setFormatIndex(Number(e.target.value))}
                className="input-field cursor-pointer"
              >
                {FORMATS.map((format, idx) => (
                  <option key={format.ext} value={idx}>
                    {format.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-[10px] text-[var(--text-4)] leading-normal">
                Ekstensi file otomatis ditambahkan jika belum ada.
              </span>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-[var(--text-2)] block mb-2 uppercase tracking-wider">Isi Catatan / Kode</label>
            <textarea
              required
              disabled={uploading}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Ketik catatan, paste tautan, atau tempelkan kode di sini..."
              rows={8}
              className="input-field font-mono text-sm leading-relaxed"
            />
          </div>

          {uploading && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-[var(--text-3)]">
                <span>Sedang menyimpan...</span>
                <span>{progress}%</span>
              </div>
              <div className="h-1 bg-[var(--surface-2)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--text-1)] transition-all duration-300"
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
              className="btn-ghost px-4 py-2 text-sm"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="btn-primary px-5 py-2 text-sm"
            >
              {uploading ? 'Menyimpan...' : 'Simpan ke Vault'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
