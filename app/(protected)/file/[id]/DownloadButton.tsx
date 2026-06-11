'use client'

export default function DownloadButton({ r2Key, driveFileId, fileName }: { r2Key?: string; driveFileId?: string; fileName: string }) {
  const handleDownload = async () => {
    const res = await fetch('/api/download-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ r2Key, driveFileId }),
    })
    const { url } = await res.json()
    const a = document.createElement('a')
    a.href = url; a.download = fileName; a.click()
  }

  return (
    <button onClick={handleDownload} className="btn-primary flex items-center gap-2 text-xs whitespace-nowrap">
      ⬇ Download
    </button>
  )
}
