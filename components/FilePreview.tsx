'use client'
import { useEffect, useState } from 'react'

type Props = { r2Key?: string; driveFileId?: string; mimeType: string; fileName: string }

export default function FilePreview({ r2Key, driveFileId, mimeType, fileName }: Props) {
  const [url, setUrl] = useState('')

  useEffect(() => {
    fetch('/api/download-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, driveFileId }),
    })
      .then(r => r.json())
      .then(d => setUrl(d.url))
  }, [r2Key, driveFileId])

  if (!url) {
    return (
      <div className="h-64 flex flex-col items-center justify-center space-y-4">
        <div className="relative w-12 h-12">
          {/* Inner glass layer */}
          <div className="absolute inset-0 rounded-full border-2 border-white/5" />
          {/* Neon spinning arc */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-violet-500 border-r-pink-500 animate-spinner-neon shadow-[0_0_15px_rgba(139,92,246,0.3)]" />
        </div>
        <p className="text-xs text-slate-400 font-medium animate-pulse">Menyiapkan preview...</p>
      </div>
    )
  }

  if (mimeType.startsWith('image/')) {
    return <img src={url} alt={fileName} className="max-w-full max-h-[70vh] rounded-xl mx-auto object-contain" />
  }
  if (mimeType.startsWith('video/')) {
    return (
      <video controls className="w-full max-h-[70vh] rounded-xl" src={url}>
        Browser Anda tidak mendukung video.
      </video>
    )
  }
  if (mimeType === 'application/pdf') {
    return <iframe src={url} className="w-full h-[70vh] rounded-xl border border-white/10" title={fileName} />
  }
  if (mimeType.startsWith('text/') || mimeType === 'application/json') {
    return <TextPreview url={url} />
  }
  return (
    <div className="text-center py-12 text-slate-500">
      <div className="text-5xl mb-4">📎</div>
      <p className="text-sm">Preview tidak tersedia untuk tipe file ini.</p>
    </div>
  )
}

function TextPreview({ url }: { url: string }) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(true)
  useEffect(() => { 
    setLoading(true)
    fetch(url)
      .then(r => r.text())
      .then(t => {
        setText(t)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [url])

  if (loading) {
    return (
      <div className="bg-white/5 border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center space-y-3 h-48">
        <div className="relative w-8 h-8">
          <div className="absolute inset-0 rounded-full border border-white/5" />
          <div className="absolute inset-0 rounded-full border border-transparent border-t-violet-500 border-r-pink-500 animate-spinner-neon" />
        </div>
        <span className="text-xs text-slate-500 font-medium">Membaca konten teks...</span>
      </div>
    )
  }

  return (
    <pre className="bg-white/5 border border-white/10 rounded-xl p-4 text-sm text-slate-300 overflow-auto max-h-[70vh] whitespace-pre-wrap break-all font-mono">
      {text}
    </pre>
  )
}
