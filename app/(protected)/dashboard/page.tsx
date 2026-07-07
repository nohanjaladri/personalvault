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
  
  // Note Form States
  const [noteTitle, setNoteTitle] = useState('')
  const [noteContent, setNoteContent] = useState('')
  const [noteFormatIdx, setNoteFormatIdx] = useState(0)
  const [noteUploading, setNoteUploading] = useState(false)
  const [noteProgress, setNoteProgress] = useState(0)

  // Track files uploaded in the current browser session
  const [sessionUploads, setSessionUploads] = useState<SessionUpload[]>([])
  
  const searchParams = useSearchParams()
  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()
  const q = searchParams.get('q') ?? ''

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    const url = q ? `/api/files?q=${encodeURIComponent(q)}` : '/api/files'
    const res = await fetch(url)
    const data = await res.json()
    setFiles(data)
    setLoading(false)
  }, [q])

  useEffect(() => {
    fetchFiles()
  }, [fetchFiles])

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
    fetchFiles()
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
      setNoteProgress(40)

      // Upload file content to Supabase Storage with XHR for accurate progress
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type)
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 45) + 40
            setNoteProgress(pct)
          }
        }
        
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error('Gagal mengunggah catatan'))
          }
        }
        xhr.onerror = () => reject(new Error('Koneksi bermasalah'))
        xhr.send(file)
      })

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


  return (
    <div className="space-y-6">
      {/* ================= TAMPILAN: FULL VAULT ACCESS ================= */}
      <div className="space-y-6">
        <DropZone onUploadComplete={handleUploadComplete} />

        {!q && (
          <>
            <p className="section-heading text-[#737373] mb-4">Kategori</p>
            <CategoryCards stats={categoryStats} />
          </>
        )}

        <div className="flex items-center justify-between mb-4 mt-8">
          <p className="section-heading text-[#737373]">
            {q ? `Hasil pencarian "${q}"` : 'File Terbaru'}
          </p>
          <span className="text-xs text-[#a3a3a3] tabular-nums">{files.length} file</span>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-[var(--surface)] border border-[var(--border)] rounded overflow-hidden flex flex-col relative">
                {/* Shimmer overlay */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                  <div className="w-[200%] h-full -translate-x-full animate-shimmer bg-[linear-gradient(90deg,transparent,rgba(128,128,128,0.05),transparent)]" />
                </div>
                {/* Thumbnail area */}
                <div className="w-full aspect-[4/3] bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-center">
                  <div className="w-10 h-10 rounded bg-[var(--surface-3)]" />
                </div>
                {/* Content area */}
                <div className="p-4 flex-1 flex flex-col justify-between gap-4">
                  <div className="space-y-2">
                    <div className="h-3.5 w-3/4 bg-[var(--surface-2)] rounded" />
                    <div className="h-2.5 w-1/3 bg-[var(--surface-3)] rounded" />
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
                    <div className="h-3 w-10 bg-[var(--surface-2)] rounded" />
                    <div className="flex gap-1">
                      <div className="w-7 h-7 bg-[var(--surface-2)] rounded border border-[var(--border)]" />
                      <div className="w-7 h-7 bg-[var(--surface-2)] rounded border border-[var(--border)]" />
                      <div className="w-7 h-7 bg-[var(--surface-2)] rounded border border-[var(--border)]" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <FileGrid files={files} onRefresh={fetchFiles} />
        )}
      </div>
    </div>
  )
}
