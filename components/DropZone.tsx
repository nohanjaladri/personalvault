'use client'
import { useCallback, useRef, useState } from 'react'
import { useToast } from './Toast'
import JSZip from 'jszip'
import { captureVideoThumbnail } from '@/lib/video-thumbnail-client'

/* ── Compress folder to ZIP (client-side) ──────────────────── */
const compressFolderToZip = async (files: File[]): Promise<File> => {
  const zip = new JSZip()
  let folderName = 'folder-archive'

  if (files.length > 0 && files[0].webkitRelativePath) {
    const parts = files[0].webkitRelativePath.split('/')
    if (parts[0]) folderName = parts[0]
  }

  files.forEach(file => {
    zip.file(file.webkitRelativePath || file.name, file)
  })

  const blob = await zip.generateAsync({ type: 'blob' })
  return new File([blob], `${folderName}.zip`, { type: 'application/zip' })
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

/* ── SVG icons ─────────────────────────────────────────────── */
const IconUpload = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
    <path d="M10 13V4M6 7l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 14v2a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
)

const IconFile = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M2.5 1.5h5.5l2.5 2.5v7.5a.5.5 0 0 1-.5.5h-7.5a.5.5 0 0 1-.5-.5v-9.5a.5.5 0 0 1 .5-.5Z"
      stroke="currentColor" strokeWidth="1.2"/>
    <path d="M8 1.5V4h2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const IconFolder = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
    <path d="M1 3.5A1 1 0 0 1 2 2.5h2.586a1 1 0 0 1 .707.293L6 3.5h5a1 1 0 0 1 1 1V10a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5Z"
      stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

export default function DropZone({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string | null>(null)
  const [currentFileProgress, setCurrentFileProgress] = useState(0)
  const [uploadSpeed, setUploadSpeed] = useState<string>('')
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const activeXhrRef = useRef<XMLHttpRequest | null>(null)

  const uploadFile = async (file: File, onProgress: (pct: number, speed: string) => void) => {
    const displayName = file.webkitRelativePath || file.name
    
    console.log('[Upload] Starting upload for:', displayName, {
      type: file.type,
      size: file.size
    })

    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fileName: displayName,
        contentType: file.type || 'application/octet-stream',
        size: file.size,
        
      }),
    })

    if (!urlRes.ok) {
      const errData = await urlRes.json().catch(() => ({}))
      console.error('[Upload] Failed to get upload URL:', errData)
      throw new Error(errData.error || `Gagal mendapatkan upload URL untuk ${displayName}`)
    }
    const { uploadUrl, r2Key, isGDrive, driveFileId: directId } = await urlRes.json()
    
    console.log('[Upload] Got upload URL response:', { 
      isGDrive, 
      hasUploadUrl: !!uploadUrl,
      uploadUrlPrefix: uploadUrl?.substring(0, 50)
    })

    let finalDriveFileId = directId
    let finalR2Key = r2Key

    if (isGDrive) {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        activeXhrRef.current = xhr
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        // Removed x-upload-url header for direct upload
        
        // Content-Range: untuk file kosong, gunakan format khusus
        // Untuk file dengan konten, gunakan format standar
        if (file.size === 0) {
          xhr.setRequestHeader('Content-Range', 'bytes */0')
        } else {
          xhr.setRequestHeader('Content-Range', `bytes 0-${file.size - 1}/${file.size}`)
        }

        const startTime = Date.now()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            const elapsed = (Date.now() - startTime) / 1000
            const speed = elapsed > 0 ? e.loaded / elapsed : 0
            const speedStr = speed > 0 ? `${formatFileSize(speed)}/s` : ''
            onProgress(pct, speedStr)
          }
        }
        xhr.onload = () => {
          activeXhrRef.current = null
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const uploadData = JSON.parse(xhr.responseText)
              finalDriveFileId = uploadData.id
              console.log('[Upload] GDrive file ID:', uploadData.id)
            } catch (e) { 
              console.error('[Upload] Failed to parse GDrive response:', e)
            }
            resolve()
          } else {
            const errorMsg = xhr.responseText || `Status ${xhr.status}`
            console.error('[Upload] GDrive error:', errorMsg)
            reject(new Error(`Gagal mengunggah ${displayName} ke Google Drive: ${errorMsg.substring(0, 100)}`))
          }
        }
        xhr.onerror = () => { activeXhrRef.current = null; reject(new Error(`Koneksi error saat mengunggah ${displayName}`)) }
        xhr.onabort = () => { activeXhrRef.current = null; reject(new Error('Unggahan dibatalkan oleh pengguna')) }
        xhr.send(file)
      })
    } else {
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        activeXhrRef.current = xhr
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')

        const startTime = Date.now()
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100)
            const elapsed = (Date.now() - startTime) / 1000
            const speed = elapsed > 0 ? e.loaded / elapsed : 0
            const speedStr = speed > 0 ? `${formatFileSize(speed)}/s` : ''
            onProgress(pct, speedStr)
          }
        }
        xhr.onload = () => {
          activeXhrRef.current = null
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Gagal mengunggah ${displayName} ke storage`))
          }
        }
        xhr.onerror = () => { activeXhrRef.current = null; reject(new Error(`Koneksi error saat mengunggah ${displayName}`)) }
        xhr.onabort = () => { activeXhrRef.current = null; reject(new Error('Unggahan dibatalkan oleh pengguna')) }
        xhr.send(file)
      })
    }

    const metaRes = await fetch('/api/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: displayName,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
        r2Key: finalR2Key || null,
        driveFileId: finalDriveFileId || null,
      }),
    })
    if (!metaRes.ok) throw new Error(`Gagal menyimpan metadata untuk ${displayName}`)
    const savedFileMeta = await metaRes.json()

    // Jika video, generate & upload thumbnail background process
    if (file.type?.startsWith('video/')) {
      captureVideoThumbnail(file, 1.5).then(async (thumbBlob) => {
        if (!thumbBlob) return
        
        try {
          const thumbRes = await fetch('/api/upload-thumbnail-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: savedFileMeta.id, contentType: 'image/jpeg' })
          })
          
          if (!thumbRes.ok) return
          const { uploadUrl, thumbnailKey } = await thumbRes.json()
          
          // Upload thumbnail blob ke storage (R2/S3)
          await fetch(uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: thumbBlob
          })
          
          // Update database
          await fetch('/api/files/update-thumbnail', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fileId: savedFileMeta.id, thumbnailKey })
          })
        } catch (err) {
          console.error('[Upload] Failed to generate/upload video thumbnail:', err)
        }
      }).catch(err => {
         console.error('[Upload] Error capturing thumbnail:', err)
      })
    }

    window.dispatchEvent(new CustomEvent('session-file-uploaded', {
      detail: { name: displayName, size: file.size, mimeType: file.type || 'application/octet-stream' },
    }))
  }

  const handleStartUpload = async () => {
    if (selectedFiles.length === 0) return
    setUploading(true)
    setProgress(0)

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i]
        setCurrentUploadingFile(file.webkitRelativePath || file.name)
        setCurrentFileProgress(0)
        setUploadSpeed('')
        await uploadFile(file, (pct, speed) => {
          setCurrentFileProgress(pct)
          setUploadSpeed(speed)
        })
        setProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
      }
      showToast(`${selectedFiles.length} file berhasil diunggah ke Vault ✓`)
      setSelectedFiles([])
      onUploadComplete()
    } catch (err: unknown) {
      console.error(err)
      const errMsg = err instanceof Error ? err.message : ''
      if (errMsg === 'Unggahan dibatalkan oleh pengguna') {
        showToast('Unggahan dibatalkan')
      } else {
        showToast(errMsg || 'Terjadi kesalahan saat mengunggah')
      }
    } finally {
      setUploading(false)
      setProgress(0)
      setCurrentUploadingFile(null)
      setCurrentFileProgress(0)
      setUploadSpeed('')
      activeXhrRef.current = null
    }
  }

  const readEntryIntoFiles = async (entry: unknown, path = ''): Promise<File[]> => {
    const e = entry as { isFile: boolean; isDirectory: boolean; file: (cb: (f: File) => void, err: () => void) => void; name: string; createReader: () => { readEntries: (cb: (entries: unknown[]) => void, err: () => void) => void } }
    return new Promise((resolve) => {
      if (e.isFile) {
        e.file((file: File) => {
          const relativePath = path ? `${path}/${file.name}` : file.name
          const fileWithRelativePath = new File([file], file.name, { type: file.type })
          Object.defineProperty(fileWithRelativePath, 'webkitRelativePath', { value: relativePath, writable: false })
          resolve([fileWithRelativePath])
        }, () => resolve([]))
      } else if (e.isDirectory) {
        const dirReader = e.createReader()
        dirReader.readEntries(async (entries: unknown[]) => {
          const filePromises = entries.map(childEntry =>
            readEntryIntoFiles(childEntry, path ? `${path}/${e.name}` : e.name)
          )
          const results = await Promise.all(filePromises)
          resolve(results.flat())
        }, () => resolve([]))
      } else {
        resolve([])
      }
    })
  }

  const handleFiles = useCallback(async (fileList: FileList | null, droppedItems?: DataTransferItemList) => {
    if (!fileList) return
    let filesArray: File[] = []

    if (droppedItems && droppedItems.length > 0) {
      const promises = Array.from(droppedItems).map(async (item) => {
        const entry = item.webkitGetAsEntry()
        if (entry) return readEntryIntoFiles(entry)
        return []
      })
      const results = await Promise.all(promises)
      filesArray = results.flat()
      if (filesArray.length === 0) filesArray = Array.from(fileList)
    } else {
      filesArray = Array.from(fileList)
    }

    const isFolderUpload = filesArray.length > 0 && filesArray.some(f => !!f.webkitRelativePath)

    if (isFolderUpload) {
      const rootFolder = filesArray[0].webkitRelativePath.split('/')[0] || 'folder'
      const wantZip = confirm(
        `Folder "${rootFolder}" terdeteksi.\n\n` +
        `Kompres menjadi "${rootFolder}.zip" sebelum unggah?\n` +
        `(Direkomendasikan untuk menghemat kuota)`
      )
      if (wantZip) {
        showToast('Membuat ZIP di browser...')
        try {
          const zippedFile = await compressFolderToZip(filesArray)
          setSelectedFiles(prev => [...prev, zippedFile])
        } catch {
          showToast('Gagal membuat arsip ZIP')
        }
        return
      }
    }

    setSelectedFiles(prev => [...prev, ...filesArray])
  }, [])

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const totalSize = selectedFiles.reduce((sum, f) => sum + f.size, 0)

  return (
    <div className="space-y-4">
      {/* ── Drop zone ── */}
      <div
        onDragOver={e => { e.preventDefault(); if (!uploading) setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => {
          e.preventDefault()
          setIsDragging(false)
          if (!uploading) await handleFiles(e.dataTransfer.files, e.dataTransfer.items)
        }}
        className={`
          border-2 border-dashed rounded p-8 text-center transition-all duration-150
          ${uploading
            ? 'opacity-50 cursor-not-allowed border-[var(--border-2)] bg-[var(--bg)]'
            : isDragging
              ? 'border-[var(--text-1)] bg-[var(--surface-2)]'
              : 'border-[var(--border-2)] bg-[var(--surface)] hover:border-[var(--text-4)] hover:bg-[var(--bg)] cursor-pointer'
          }
        `}
      >
        {/* Hidden inputs */}
        <input
          id="file-input"
          ref={inputRef}
          type="file"
          multiple
          className="hidden"
          disabled={uploading}
          onChange={e => handleFiles(e.target.files)}
        />
        <input
          id="folder-input"
          ref={folderInputRef}
          type="file"
          // @ts-ignore
          webkitdirectory="true"
          directory="true"
          className="hidden"
          disabled={uploading}
          onChange={e => handleFiles(e.target.files)}
        />

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className={`w-10 h-10 rounded flex items-center justify-center border transition-all duration-300 ${isDragging ? 'bg-[var(--text-1)] border-[var(--text-1)] text-[var(--bg)] scale-110 animate-bounce' : 'bg-[var(--surface-2)] border-[var(--border)] text-[var(--text-3)]'}`}>
            <IconUpload />
          </div>
        </div>

        <p className="text-sm font-semibold text-[var(--text-1)] mb-1">
          {isDragging ? 'Lepaskan file di sini' : 'Drag & drop file atau folder'}
        </p>
        <p className="text-xs text-[var(--text-4)] mb-5">
          Folder akan otomatis dikompres menjadi .zip
        </p>

        {/* Action buttons */}
        <div className="flex justify-center gap-3" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="btn-primary text-xs py-2 px-4 gap-1.5 flex items-center cursor-pointer"
          >
            <IconFile />
            Pilih Berkas
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => folderInputRef.current?.click()}
            className="btn-ghost text-xs py-2 px-4 gap-1.5 flex items-center cursor-pointer"
          >
            <IconFolder />
            Pilih Folder
          </button>
        </div>
      </div>

      {/* ── File queue ── */}
      {selectedFiles.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-5 space-y-4">
          {/* Queue header */}
          <div className="flex items-center justify-between pb-3 border-b border-[var(--border)]">
            <div>
              <p className="section-heading text-[var(--text-2)]">Antrean Unggahan</p>
              <p className="text-xs text-[var(--text-4)] mt-1">
                {selectedFiles.length} file &nbsp;·&nbsp; {formatFileSize(totalSize)}
              </p>
            </div>
            {!uploading && (
              <button
                onClick={() => setSelectedFiles([])}
                className="text-xs text-[#a3a3a3] hover:text-[#DC2626] transition-colors cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* File list */}
          <div className="space-y-1 max-h-[168px] overflow-y-auto scrollbar-thin">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between px-3 py-2.5 bg-[var(--bg)] border border-[var(--border)] rounded text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="text-[var(--text-4)] shrink-0"><IconFile /></span>
                  <span
                    className="truncate text-[var(--text-2)] font-medium"
                    title={file.webkitRelativePath || file.name}
                  >
                    {file.webkitRelativePath || file.name}
                  </span>
                </div>
                <div className="flex items-center gap-3 shrink-0 ml-3">
                  <span className="text-[var(--text-4)] tabular-nums">{formatFileSize(file.size)}</span>
                  {!uploading && (
                    <button
                      onClick={e => { e.stopPropagation(); handleRemoveFile(index) }}
                      className="text-[var(--border-2)] hover:text-[#DC2626] transition-colors font-bold text-sm cursor-pointer leading-none"
                      title="Hapus dari antrean"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress section */}
          {uploading && (
            <div className="space-y-3 pt-1">
              {currentUploadingFile && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 min-w-0">
                      {/* Active indicator: small pulsing dot */}
                      <div className="w-1.5 h-1.5 rounded-full bg-[#DC2626] shrink-0 animate-pulse" />
                      <span className="text-xs text-[var(--text-2)] truncate">
                        {currentUploadingFile}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 ml-3">
                      {uploadSpeed && (
                        <span className="text-xs text-[var(--text-4)] tabular-nums">
                          {uploadSpeed}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-[var(--text-1)] tabular-nums">
                        {currentFileProgress}%
                      </span>
                      <button
                        onClick={() => activeXhrRef.current?.abort()}
                        className="btn-danger text-[10px] py-0.5 px-2 cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                  {/* Current file progress */}
                  <div className="h-[3px] bg-[var(--surface-2)] rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-[var(--text-1)] transition-all duration-150"
                      style={{ width: `${currentFileProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Total queue progress */}
              <div className="space-y-1.5 pt-2 border-t border-[var(--border)]">
                <div className="flex justify-between">
                  <span className="section-heading text-[var(--text-4)]">Total</span>
                  <span className="text-[10px] font-semibold text-[var(--text-1)] tabular-nums">{progress}%</span>
                </div>
                <div className="h-[3px] bg-[var(--surface-2)] rounded-sm overflow-hidden">
                  <div
                    className="h-full bg-[#DC2626] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Upload action */}
          {!uploading && (
            <button
              onClick={handleStartUpload}
              className="btn-primary w-full py-2.5 text-sm cursor-pointer gap-2 flex items-center justify-center"
            >
              <IconUpload />
              Mulai Upload &nbsp;
              <span className="font-normal opacity-70">({selectedFiles.length} berkas)</span>
            </button>
          )}
        </div>
      )}
    </div>
  )
}
