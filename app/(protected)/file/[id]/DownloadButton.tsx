'use client'

import { useState } from 'react'

export default function DownloadButton({ r2Key, driveFileId, fileName }: { r2Key?: string; driveFileId?: string; fileName: string }) {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleDownload = async () => {
    try {
      setDownloading(true)
      setProgress(0)

      const res = await fetch('/api/download-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ r2Key, driveFileId }),
      })
      const { url } = await res.json()

      // Fetch the actual file via XHR for progress tracking
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('GET', url)
        xhr.responseType = 'blob'

        xhr.onprogress = (e) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            const blob = xhr.response
            const blobUrl = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = blobUrl
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            document.body.removeChild(a)
            window.URL.revokeObjectURL(blobUrl)
            resolve()
          } else {
            reject(new Error('Gagal men-download berkas'))
          }
        }

        xhr.onerror = () => reject(new Error('Koneksi bermasalah'))
        xhr.send()
      })
    } catch (error) {
      console.error(error)
      alert('Gagal mengunduh file ❌')
    } finally {
      setDownloading(false)
      setProgress(0)
    }
  }

  return (
    <div className="relative flex flex-col items-stretch">
      <button 
        onClick={handleDownload} 
        disabled={downloading}
        className="btn-primary relative overflow-hidden flex items-center justify-center gap-2 text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer select-none"
      >
        {downloading ? (
          <>
            <span className="animate-spin text-[10px]">⏳</span>
            <span className="z-10">Downloading... {progress}%</span>
          </>
        ) : (
          <>
            <span>⬇</span>
            <span>Download</span>
          </>
        )}
        {downloading && (
          <div 
            className="absolute bottom-0 left-0 h-1 bg-gradient-to-r from-violet-400 to-pink-400 transition-all duration-150 ease-out"
            style={{ width: `${progress}%` }}
          />
        )}
      </button>
    </div>
  )
}
