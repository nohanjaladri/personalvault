'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CATEGORY_EMOJI } from '@/lib/utils/category'
import { formatFileSize, formatDate } from '@/lib/utils/format'
import { useToast } from './Toast'

type FileRow = { id: string; name: string; size: number; category: string; mime_type: string; created_at: string; is_starred: boolean; is_public?: boolean; r2_key?: string; drive_file_id?: string; thumbnail_key?: string; thumbnail_url?: string }


// Cache memori untuk menyimpan signed URLs agar menghemat request (kedaluwarsa dalam 14 menit)
type CacheEntry = { url: string; expiresAt: number }
const signedUrlCache = new Map<string, CacheEntry>()

function ImageCardPreview({ r2Key, driveFileId, name }: { r2Key?: string; driveFileId?: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Intersection Observer untuk Lazy Loading
  useEffect(() => {
    if (!r2Key && !driveFileId) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [r2Key, driveFileId])

  // 2. Mengambil Signed URL dari Cache atau API
  useEffect(() => {
    if ((!r2Key && !driveFileId) || !isIntersecting) return

    const cacheKey = r2Key || driveFileId!
    const now = Date.now()
    const cached = signedUrlCache.get(cacheKey)

    if (cached && cached.expiresAt > now + 120 * 1000) {
      setUrl(cached.url)
      return
    }

    fetch('/api/download-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, driveFileId, isThumbnail: true }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setUrl(data.url)
          signedUrlCache.set(cacheKey, {
            url: data.url,
            expiresAt: Date.now() + 14 * 60 * 1000,
          })
        }
      })
      .catch(err => console.error(err))
  }, [r2Key, driveFileId, isIntersecting])

  if (!url) {
    return (
      <div ref={containerRef} className="w-full aspect-[4/3] bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--border-2)] border-t-[var(--text-1)] rounded-full animate-spinner-neon" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full aspect-[4/3] relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)]">
      <img
        src={url}
        alt={name}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
      />
    </div>
  )
}

function VideoCardPreview({ thumbnailKey, thumbnailUrl, driveFileId, name }: { thumbnailKey?: string; thumbnailUrl?: string; driveFileId?: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!thumbnailKey && !thumbnailUrl && !driveFileId) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect()
        }
      },
      { rootMargin: '200px' }
    )

    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [thumbnailKey, thumbnailUrl, driveFileId])

  useEffect(() => {
    if ((!thumbnailKey && !thumbnailUrl && !driveFileId) || !isIntersecting) return

    // Jika sudah ada thumbnail URL, langsung gunakan
    if (thumbnailUrl) {
      setUrl(thumbnailUrl)
      return
    }

    const cacheKey = thumbnailKey || `video-${driveFileId}`
    const now = Date.now()
    const cached = signedUrlCache.get(cacheKey)

    if (cached && cached.expiresAt > now + 120 * 1000) {
      setUrl(cached.url)
      return
    }

    fetch('/api/download-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key: thumbnailKey, driveFileId, isThumbnail: true, isVideoThumbnail: true }),
    })
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          setUrl(data.url)
          signedUrlCache.set(cacheKey, {
            url: data.url,
            expiresAt: Date.now() + 14 * 60 * 1000,
          })
        }
      })
      .catch(err => console.error(err))
  }, [thumbnailKey, thumbnailUrl, driveFileId, isIntersecting])

  if (!url) {
    return (
      <div ref={containerRef} className="w-full aspect-[4/3] bg-[var(--surface-2)] border-b border-[var(--border)] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[var(--border-2)] border-t-[var(--text-1)] rounded-full animate-spinner-neon" />
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full aspect-[4/3] relative overflow-hidden border-b border-[var(--border)] bg-[var(--surface-2)] group">
      <img
        src={url}
        alt={name}
        loading="lazy"
        className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.06]"
      />
      {/* Play icon overlay */}
      <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/20 transition-colors duration-300">
        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center opacity-70 group-hover:opacity-100 transition-opacity duration-300">
          <svg className="w-5 h-5 text-black ml-0.5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  )


function FileCardPlaceholder({ category }: { category: string }) {
  const emoji = CATEGORY_EMOJI[category as keyof typeof CATEGORY_EMOJI] ?? '□'

  return (
    <div className="w-full aspect-[4/3] bg-[var(--surface-2)] border-b border-[var(--border)] flex flex-col items-center justify-center gap-2 overflow-hidden">
      <span className="text-3xl text-[var(--text-4)] transition-transform duration-300 ease-out group-hover:scale-115">{emoji}</span>
      <span className="text-[10px] uppercase tracking-widest font-semibold text-[var(--text-4)] transition-all duration-300 ease-out group-hover:tracking-[0.16em]">{category}</span>
    </div>
  )
}

export default function FileGrid({ files, onRefresh }: { files: FileRow[]; onRefresh: () => void }) {
  const { showToast } = useToast()

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    if (!confirm(`Hapus "${name}"?`)) return
    const res = await fetch(`/api/files/${id}`, { method: 'DELETE' })
    if (res.ok) { showToast(`${name} dihapus`); onRefresh() }
    else showToast('Gagal menghapus file')
  }

  const handleStar = async (e: React.MouseEvent, id: string, starred: boolean) => {
    e.preventDefault()
    const res = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_starred: !starred }),
    })
    if (res.ok) { showToast(starred ? 'Bintang dihapus' : 'Dibintangi'); onRefresh() }
  }

  const handleShareToggle = async (e: React.MouseEvent, id: string, isPublic: boolean, name: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPublic) {
      const choice = confirm(`Pilihan berkas "${name}":\n\n[OK] = Salin Tautan Berbagi\n[Batal] = Matikan Akses Publik`)
      if (choice) {
        const shareUrl = `${window.location.origin}/share/${id}`
        await navigator.clipboard.writeText(shareUrl)
        showToast('Tautan publik disalin')
      } else {
        const res = await fetch(`/api/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: false }),
        })
        if (res.ok) { showToast('Akses publik dinonaktifkan'); onRefresh() }
      }
    } else {
      const res = await fetch(`/api/files/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_public: true }),
      })
      if (res.ok) {
        const shareUrl = `${window.location.origin}/share/${id}`
        await navigator.clipboard.writeText(shareUrl)
        showToast('Berkas menjadi Publik & tautan disalin')
        onRefresh()
      } else {
        showToast('Gagal mengubah ke publik')
      }
    }
  }

  if (files.length === 0) {
    return (
      <div className="text-center py-24 text-[#a3a3a3] text-sm">
        <p className="text-4xl mb-4">□</p>
        <p>Belum ada file. Upload file pertama Anda.</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {files.map(f => (
        <div
          key={f.id}
          className="group relative bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--text-1)] rounded transition-all duration-300 ease-out overflow-hidden flex flex-col hover:shadow-[0_12px_24px_rgba(0,0,0,0.12)] hover:-translate-y-1.5"
        >
          <Link href={`/file/${f.id}`} className="block w-full">
            {f.category === 'photo' ? (
              <ImageCardPreview r2Key={f.r2_key} driveFileId={f.drive_file_id} name={f.name} />
            ) : f.category === 'video' ? (
              <VideoCardPreview thumbnailKey={f.thumbnail_key} thumbnailUrl={f.thumbnail_url} driveFileId={f.drive_file_id} name={f.name} />
            ) : (
              <FileCardPlaceholder category={f.category} />
            )}
          </Link>

          <div className="p-4 flex-1 flex flex-col justify-between">
            <Link href={`/file/${f.id}`} className="block min-w-0 mb-3">
              <h4 className="text-sm font-semibold text-[var(--text-1)] truncate" title={f.name}>
                {f.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-[var(--text-4)]">{formatDate(f.created_at)}</span>
                {f.is_public && (
                  <span className="badge badge-red">
                    Publik
                  </span>
                )}
              </div>
            </Link>

            <div className="flex items-center justify-between border-t border-[var(--border)] pt-3">
              <span className="text-xs text-[var(--text-3)] font-medium">{formatFileSize(f.size)}</span>

              <div className="flex items-center gap-1">
                <button
                  onClick={e => handleShareToggle(e, f.id, f.is_public ?? false, f.name)}
                  className={`w-7 h-7 rounded border flex items-center justify-center text-[10px] transition-colors cursor-pointer ${f.is_public ? 'bg-[#DC2626] border-[#DC2626] text-white' : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-3)] hover:border-[var(--text-1)] hover:text-[var(--text-1)]'}`}
                  title={f.is_public ? 'Tautan Berbagi / Matikan Berbagi' : 'Jadikan Publik'}
                >
                  ⇧
                </button>
                <button
                  onClick={e => handleStar(e, f.id, f.is_starred)}
                  className={`w-7 h-7 rounded border flex items-center justify-center text-[10px] transition-colors cursor-pointer ${f.is_starred ? 'bg-[var(--text-1)] border-[var(--text-1)] text-[var(--bg)]' : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-3)] hover:border-[var(--text-1)] hover:text-[var(--text-1)]'}`}
                  title={f.is_starred ? 'Hapus bintang' : 'Bintangi'}
                >
                  ★
                </button>
                <button
                  onClick={e => handleDelete(e, f.id, f.name)}
                  className="w-7 h-7 rounded border bg-[var(--surface-2)] border-[var(--border)] flex items-center justify-center text-[10px] text-[var(--text-3)] hover:bg-[#DC2626] hover:border-[#DC2626] hover:text-white transition-colors cursor-pointer"
                  title="Hapus"
                >
                  ×
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
