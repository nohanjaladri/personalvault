'use client'
import { useCallback, useRef, useState } from 'react'
import { useToast } from './Toast'
import JSZip from 'jszip'

// Fungsi kompresi folder menjadi ZIP di sisi klien (browser)
const compressFolderToZip = async (files: File[]): Promise<File> => {
  const zip = new JSZip()
  let folderName = 'folder-archive'
  
  if (files.length > 0 && files[0].webkitRelativePath) {
    const parts = files[0].webkitRelativePath.split('/')
    if (parts[0]) {
      folderName = parts[0]
    }
  }

  files.forEach(file => {
    // Masukkan file dengan path relatif aslinya untuk menjaga hierarki folder saat diekstrak
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

export default function DropZone({ onUploadComplete }: { onUploadComplete: () => void }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [currentUploadingFile, setCurrentUploadingFile] = useState<string | null>(null)
  const [currentFileProgress, setCurrentFileProgress] = useState(0)
  const { showToast } = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const folderInputRef = useRef<HTMLInputElement>(null)
  const activeXhrRef = useRef<XMLHttpRequest | null>(null)

  const uploadFile = async (file: File, onProgress: (pct: number) => void) => {
    // Jalur folder relatif jika ada (menjaga struktur folder)
    const displayName = file.webkitRelativePath || file.name

    const urlRes = await fetch('/api/upload-url', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        fileName: displayName, 
        contentType: file.type || 'application/octet-stream',
        size: file.size 
      }),
    })
    
    if (!urlRes.ok) {
      const errData = await urlRes.json().catch(() => ({}))
      throw new Error(errData.error || `Gagal mendapatkan upload URL untuk ${displayName}`)
    }
    const { uploadUrl, r2Key, isGDrive, driveFileId: directId } = await urlRes.json()

    let finalDriveFileId = directId
    let finalR2Key = r2Key

    if (isGDrive) {
      // Unggah ke Google Drive via server stream dengan XMLHttpRequest untuk progress akurat
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        activeXhrRef.current = xhr
        xhr.open('POST', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        xhr.setRequestHeader('X-File-Name', encodeURIComponent(displayName))
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        
        xhr.onload = () => {
          activeXhrRef.current = null
          if (xhr.status >= 200 && xhr.status < 300) {
            try {
              const uploadData = JSON.parse(xhr.responseText)
              finalDriveFileId = uploadData.driveFileId
              resolve()
            } catch {
              resolve()
            }
          } else {
            reject(new Error(`Gagal mengunggah file ${displayName} ke Google Drive`))
          }
        }
        xhr.onerror = () => {
          activeXhrRef.current = null
          reject(new Error(`Koneksi error saat mengunggah ${displayName}`))
        }
        xhr.onabort = () => {
          activeXhrRef.current = null
          reject(new Error('Unggahan dibatalkan oleh pengguna'))
        }
        xhr.send(file)
      })
    } else {
      // Unggah ke Supabase Storage (S3) biasa dengan XMLHttpRequest untuk progress akurat
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        activeXhrRef.current = xhr
        xhr.open('PUT', uploadUrl)
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream')
        
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            onProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        
        xhr.onload = () => {
          activeXhrRef.current = null
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve()
          } else {
            reject(new Error(`Gagal mengunggah file ${displayName} ke storage`))
          }
        }
        xhr.onerror = () => {
          activeXhrRef.current = null
          reject(new Error(`Koneksi error saat mengunggah ${displayName}`))
        }
        xhr.onabort = () => {
          activeXhrRef.current = null
          reject(new Error('Unggahan dibatalkan oleh pengguna'))
        }
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
        driveFileId: finalDriveFileId || null
      }),
    })
    if (!metaRes.ok) throw new Error(`Gagal menyimpan metadata untuk ${displayName}`)
    
    // Kirim event kustom untuk mencatat riwayat unggahan sesi ini
    window.dispatchEvent(new CustomEvent('session-file-uploaded', { 
      detail: { name: displayName, size: file.size, mimeType: file.type || 'application/octet-stream' } 
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
        await uploadFile(file, (pct) => {
          setCurrentFileProgress(pct)
        })
        setProgress(Math.round(((i + 1) / selectedFiles.length) * 100))
      }
      showToast(`Berhasil mengunggah ${selectedFiles.length} file ke brankas! ✨`)
      setSelectedFiles([])
      onUploadComplete()
    } catch (err: any) {
      console.error(err)
      if (err.message === 'Unggahan dibatalkan oleh pengguna') {
        showToast('Unggahan dibatalkan ⚠️')
      } else {
        showToast(err.message || 'Terjadi kesalahan saat mengunggah ❌')
      }
    } finally {
      setUploading(false)
      setProgress(0)
      setCurrentUploadingFile(null)
      setCurrentFileProgress(0)
      activeXhrRef.current = null
    }
  }

  // Membaca isi folder secara rekursif dari DataTransferItem / FileSystemEntry
  const readEntryIntoFiles = async (entry: any, path = ''): Promise<File[]> => {
    return new Promise((resolve) => {
      if (entry.isFile) {
        entry.file((file: File) => {
          // Buat objek File baru dengan webkitRelativePath kustom agar dikenali sebagai folder oleh zip maker
          const relativePath = path ? `${path}/${file.name}` : file.name
          const fileWithRelativePath = new File([file], file.name, { type: file.type })
          Object.defineProperty(fileWithRelativePath, 'webkitRelativePath', {
            value: relativePath,
            writable: false
          })
          resolve([fileWithRelativePath])
        }, () => resolve([]))
      } else if (entry.isDirectory) {
        const dirReader = entry.createReader()
        dirReader.readEntries(async (entries: any[]) => {
          const filePromises = entries.map(childEntry => 
            readEntryIntoFiles(childEntry, path ? `${path}/${entry.name}` : entry.name)
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

    // Jika di-drop, gunakan webkitGetAsEntry untuk membaca folder secara rekursif
    if (droppedItems && droppedItems.length > 0) {
      const promises = Array.from(droppedItems).map(async (item) => {
        const entry = item.webkitGetAsEntry()
        if (entry) {
          return readEntryIntoFiles(entry)
        }
        return []
      })
      const results = await Promise.all(promises)
      filesArray = results.flat()
      
      // Jika tidak ada berkas rekursif yang ditemukan (fallback)
      if (filesArray.length === 0) {
        filesArray = Array.from(fileList)
      }
    } else {
      filesArray = Array.from(fileList)
    }

    // Deteksi jika unggahan berasal dari folder (memiliki webkitRelativePath)
    const isFolderUpload = filesArray.length > 0 && filesArray.some(f => !!f.webkitRelativePath)

    if (isFolderUpload) {
      const rootFolder = filesArray[0].webkitRelativePath.split('/')[0] || 'folder'
      const wantZip = confirm(`Folder "${rootFolder}" terdeteksi.\n\nApakah Anda ingin mengompres folder ini menjadi file tunggal "${rootFolder}.zip" sebelum masuk antrean?\n(Direkomendasikan untuk menghemat kuota & merapikan struktur brankas)`)
      
      if (wantZip) {
        showToast('Sedang membuat file ZIP di browser... 🗜️')
        try {
          const zippedFile = await compressFolderToZip(filesArray)
          setSelectedFiles(prev => [...prev, zippedFile])
        } catch (err) {
          console.error(err)
          showToast('Gagal membuat arsip ZIP ❌')
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
      {/* Drag & Drop Area */}
      <div
        onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={async (e) => { 
          e.preventDefault()
          setIsDragging(false)
          await handleFiles(e.dataTransfer.files, e.dataTransfer.items)
        }}
        className={`border-2 border-dashed rounded-2xl p-7 text-center transition-all duration-300 ${
          uploading ? 'opacity-50 cursor-not-allowed border-white/10 bg-white/[0.01]' :
          isDragging ? 'border-violet-500 bg-violet-500/10 scale-[1.01]' : 'border-violet-500/30 bg-violet-500/[0.04] hover:bg-violet-500/10 hover:border-violet-500/60'
        }`}
      >
        {/* Input Berkas */}
        <input id="file-input" ref={inputRef} type="file" multiple className="hidden" disabled={uploading} onChange={e => handleFiles(e.target.files)} />
        
        {/* Input Folder (HTML5 webkitdirectory) */}
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

        <span className="text-3xl block mb-2 animate-bounce">📤</span>
        <p className="text-slate-400 text-sm mb-3">Drag & drop file/folder ke sini, atau klik tombol di bawah</p>
        
        <div className="flex justify-center gap-3 mb-2" onClick={e => e.stopPropagation()}>
          <button
            type="button"
            disabled={uploading}
            onClick={() => inputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer"
          >
            📄 Pilih Berkas
          </button>
          <button
            type="button"
            disabled={uploading}
            onClick={() => folderInputRef.current?.click()}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-white/10 hover:bg-white/20 text-slate-200 transition-colors cursor-pointer"
          >
            📁 Pilih Folder
          </button>
        </div>

        <p className="text-slate-600 text-[10px] mt-1">
          folder otomatis dikompresi menjadi file .zip sebelum masuk antrean
        </p>
      </div>

      {/* Antrean Berkas */}
      {selectedFiles.length > 0 && (
        <div className="bg-slate-900/50 p-5 border border-white/10 shadow-lg rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-2.5">
            <div className="space-y-0.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Antrean Berkas</h4>
              <p className="text-[10px] text-slate-500">{selectedFiles.length} file • {formatFileSize(totalSize)}</p>
            </div>
            {!uploading && (
              <button 
                onClick={() => setSelectedFiles([])}
                className="text-[10px] text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                Kosongkan
              </button>
            )}
          </div>

          {/* List Files */}
          <div className="space-y-2 max-h-[180px] overflow-y-auto pr-1.5 scrollbar-thin">
            {selectedFiles.map((file, index) => (
              <div 
                key={index}
                className="p-2 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0 pr-2">
                  <span className="text-slate-500">📎</span>
                  <div className="truncate font-medium text-slate-300" title={file.webkitRelativePath || file.name}>
                    {file.webkitRelativePath || file.name}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-[10px] text-slate-500 font-medium">{formatFileSize(file.size)}</span>
                  {!uploading && (
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleRemoveFile(index) }}
                      className="text-slate-500 hover:text-red-400 transition-colors text-sm font-bold cursor-pointer"
                      title="Hapus dari antrean"
                    >
                      &times;
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="space-y-3 bg-white/[0.02] border border-white/5 p-4 rounded-xl">
              {currentUploadingFile && (
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[11px] text-slate-300">
                    <span className="truncate font-medium flex items-center gap-1.5 max-w-[70%]">
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-ping"></span>
                      Mengunggah: <strong className="text-violet-400 font-normal">{currentUploadingFile}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-violet-400">{currentFileProgress}%</span>
                      <button
                        onClick={() => activeXhrRef.current?.abort()}
                        className="px-2 py-0.5 text-[9px] font-semibold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-md transition-colors cursor-pointer"
                        title="Batalkan unggahan"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-pink-500 rounded-full transition-all duration-150 ease-out shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                      style={{ width: `${currentFileProgress}%` }}
                    />
                  </div>
                </div>
              )}
              
              <div className="space-y-1.5 pt-1.5 border-t border-white/5">
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Total Progres Antrean</span>
                  <span>{progress}%</span>
                </div>
                <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-slate-400 to-slate-200 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {!uploading && (
            <button
              onClick={handleStartUpload}
              className="w-full py-2.5 text-xs font-semibold cursor-pointer shadow-md bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-all flex items-center justify-center gap-2"
            >
              🚀 Mulai Upload ({selectedFiles.length} Berkas)
            </button>
          )}
        </div>
      )}
    </div>
  )
}
