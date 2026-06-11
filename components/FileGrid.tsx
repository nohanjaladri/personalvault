'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { CATEGORY_EMOJI } from '@/lib/utils/category'
import { formatFileSize, formatDate } from '@/lib/utils/format'
import { useToast } from './Toast'

type FileRow = { id: string; name: string; size: number; category: string; mime_type: string; created_at: string; is_starred: boolean; is_public?: boolean; r2_key?: string; drive_file_id?: string }

// Cache memori untuk menyimpan signed URLs agar menghemat request (kedaluwarsa dalam 14 menit)
type CacheEntry = { url: string; expiresAt: number }
const signedUrlCache = new Map<string, CacheEntry>()

function ImageCardPreview({ r2Key, driveFileId, name }: { r2Key?: string; driveFileId?: string; name: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [isIntersecting, setIsIntersecting] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // 1. Intersection Observer untuk Lazy Loading (Hanya memicu request saat gambar mendekati layar)
  useEffect(() => {
    if (!r2Key && !driveFileId) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsIntersecting(true)
          observer.disconnect() // Lepas observer setelah terdeteksi sekali
        }
      },
      { rootMargin: '200px' } // Load gambar 200px sebelum muncul di viewport
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [r2Key, driveFileId])

  // 2. Mengambil URL bertanda (Signed URL) dari Cache atau API
  useEffect(() => {
    if ((!r2Key && !driveFileId) || !isIntersecting) return

    const cacheKey = r2Key || driveFileId!
    const now = Date.now()
    const cached = signedUrlCache.get(cacheKey)

    // Jika cache masih berlaku (menyisakan waktu > 2 menit dari 15 menit total), gunakan cache
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
            expiresAt: Date.now() + 14 * 60 * 1000 // Set aman kedaluwarsa 14 menit
          })
        }
      })
      .catch(err => console.error(err))
  }, [r2Key, driveFileId, isIntersecting])

  if (!url) {
    return (
      <div ref={containerRef} className="w-full aspect-[4/3] bg-white/[0.02] border-b border-white/[0.06] flex items-center justify-center">
        <span className="text-3xl animate-pulse">🖼️</span>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full aspect-[4/3] relative overflow-hidden border-b border-white/[0.06] bg-black/20">
      <img 
        src={url} 
        alt={name} 
        loading="lazy" 
        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105" 
      />
    </div>
  )
}

function FileCardPlaceholder({ category }: { category: string }) {
  const gradients = {
    code: 'from-blue-500/10 to-indigo-500/10 text-blue-400 border-blue-500/20',
    document: 'from-emerald-500/10 to-teal-500/10 text-emerald-400 border-emerald-500/20',
    video: 'from-pink-500/10 to-rose-500/10 text-pink-400 border-pink-500/20',
    audio: 'from-amber-500/10 to-orange-500/10 text-amber-400 border-amber-500/20',
    archive: 'from-purple-500/10 to-violet-500/10 text-purple-400 border-purple-500/20',
    other: 'from-slate-500/10 to-slate-600/10 text-slate-400 border-slate-500/20',
  }
  const grad = gradients[category as keyof typeof gradients] || gradients.other
  const emoji = CATEGORY_EMOJI[category as keyof typeof CATEGORY_EMOJI] ?? '📎'

  return (
    <div className={`w-full aspect-[4/3] bg-gradient-to-br ${grad} border-b flex flex-col items-center justify-center gap-2 relative overflow-hidden`}>
      <span className="text-4xl filter drop-shadow-[0_0_8px_rgba(255,255,255,0.15)] transition-transform duration-300 group-hover:scale-110">{emoji}</span>
      <span className="text-[10px] uppercase tracking-wider font-semibold opacity-60">{category}</span>
    </div>
  )
}

export default function FileGrid({ files, onRefresh }: { files: FileRow[]; onRefresh: () => void }) {
  const { showToast } = useToast()

  const handleDelete = async (e: React.MouseEvent, id: string, name: string) => {
    e.preventDefault()
    if (!confirm(`Hapus "${name}"?`)) return
    const res = await fetch(`/api/files/${id}`, { method: 'DELETE' })
    if (res.ok) { showToast(`${name} dihapus 🗑️`); onRefresh() }
    else showToast('Gagal menghapus file ❌')
  }

  const handleStar = async (e: React.MouseEvent, id: string, starred: boolean) => {
    e.preventDefault()
    const res = await fetch(`/api/files/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_starred: !starred }),
    })
    if (res.ok) { showToast(starred ? 'Bintang dihapus' : 'Dibintangi ⭐'); onRefresh() }
  }

  const handleShareToggle = async (e: React.MouseEvent, id: string, isPublic: boolean, name: string) => {
    e.preventDefault()
    e.stopPropagation()

    if (isPublic) {
      const choice = confirm(`Pilihan berkas "${name}":\n\n[OK] = Salin Tautan Berbagi\n[Batal] = Matikan Akses Publik (Jadikan Privat)`)
      if (choice) {
        const shareUrl = `${window.location.origin}/share/${id}`
        await navigator.clipboard.writeText(shareUrl)
        showToast('Tautan publik disalin ke clipboard! 📋')
      } else {
        const res = await fetch(`/api/files/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ is_public: false }),
        })
        if (res.ok) {
          showToast('Akses publik dinonaktifkan 🔒')
          onRefresh()
        }
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
        showToast('Berkas menjadi Publik & tautan disalin! 🌐')
        onRefresh()
      } else {
        showToast('Gagal mengubah ke publik ❌')
      }
    }
  }

  if (files.length === 0) {
    return <div className="text-center py-16 text-slate-500 text-sm">Belum ada file. Upload file pertama Anda!</div>
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {files.map(f => (
        <div 
          key={f.id}
          className="group relative bg-[rgba(10,8,22,0.45)] backdrop-blur-md border border-white/[0.08] hover:border-violet-500/40 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_12px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(139,92,246,0.1)] hover:-translate-y-1 flex flex-col"
        >
          <Link href={`/file/${f.id}`} className="block w-full">
            {f.category === 'photo' ? (
              <ImageCardPreview r2Key={f.r2_key} driveFileId={f.drive_file_id} name={f.name} />
            ) : (
              <FileCardPlaceholder category={f.category} />
            )}
          </Link>
          
          <div className="p-4 flex-1 flex flex-col justify-between">
            <Link href={`/file/${f.id}`} className="block min-w-0 mb-3">
              <h4 className="text-sm font-semibold text-slate-200 truncate group-hover:text-violet-400 transition-colors" title={f.name}>
                {f.name}
              </h4>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] text-slate-500">{formatDate(f.created_at)}</span>
                {f.is_public && (
                  <span className="text-[9px] bg-violet-500/10 text-violet-400 px-1.5 py-0.5 rounded border border-violet-500/20">
                    🌐 Publik
                  </span>
                )}
              </div>
            </Link>

            <div className="flex items-center justify-between border-t border-white/[0.05] pt-3">
              <span className="text-xs text-slate-400 font-medium">{formatFileSize(f.size)}</span>
              
              <div className="flex items-center gap-1.5">
                <button 
                  onClick={e => handleShareToggle(e, f.id, f.is_public ?? false, f.name)} 
                  className={`w-7 h-7 rounded-lg bg-white/[0.03] border border-white/10 hover:border-violet-500/40 flex items-center justify-center text-xs transition-colors cursor-pointer ${f.is_public ? 'text-violet-400 bg-violet-500/10 border-violet-500/30' : 'text-slate-400'}`}
                  title={f.is_public ? 'Tautan Berbagi / Matikan Berbagi' : 'Jadikan Publik'}
                >
                  {f.is_public ? '🌐' : '🔗'}
                </button>
                <button 
                  onClick={e => handleStar(e, f.id, f.is_starred)} 
                  className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/10 hover:border-amber-500/40 flex items-center justify-center text-xs text-slate-400 transition-colors cursor-pointer"
                  title={f.is_starred ? 'Hapus bintang' : 'Bintangi'}
                >
                  {f.is_starred ? '⭐' : '☆'}
                </button>
                <button 
                  onClick={e => handleDelete(e, f.id, f.name)} 
                  className="w-7 h-7 rounded-lg bg-white/[0.03] border border-white/10 hover:border-red-500/40 flex items-center justify-center text-xs text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
                  title="Hapus"
                >
                  🗑
                </button>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
