/**
 * Capture video thumbnail client-side menggunakan <video> + <canvas>
 * Gak perlu FFmpeg di server.
 */
export function captureVideoThumbnail(file: File, seekTime = 0.5): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.crossOrigin = 'anonymous'

    const url = URL.createObjectURL(file)
    let timeoutId: NodeJS.Timeout | null = null
    let resolved = false

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      URL.revokeObjectURL(url)
      resolved = true
    }

    // Timeout after 15 seconds
    timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn(`[Thumbnail] Timeout loading video: ${file.name}`)
        cleanup()
        resolve(null)
      }
    }, 15000)

    video.onloadedmetadata = () => {
      try {
        const duration = video.duration || 1
        if (!isFinite(duration)) {
          console.warn(`[Thumbnail] Invalid duration for ${file.name}`)
          return
        }
        const t = Math.min(seekTime, Math.max(0, duration - 0.1))
        video.currentTime = t
        console.log(`[Thumbnail] Loaded metadata for ${file.name}, duration: ${duration}s, seeking to ${t}s`)
      } catch (err) {
        console.error(`[Thumbnail] Error in onloadedmetadata for ${file.name}:`, err)
      }
    }

    video.onseeked = () => {
      try {
        if (resolved) return
        
        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 240

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          console.error(`[Thumbnail] Failed to get canvas context for ${file.name}`)
          cleanup()
          resolve(null)
          return
        }

        // Draw with aspect-ratio fit (center-crop)
        const vw = video.videoWidth || 320
        const vh = video.videoHeight || 240
        if (vw === 0 || vh === 0) {
          console.error(`[Thumbnail] Invalid video dimensions for ${file.name}: ${vw}x${vh}`)
          cleanup()
          resolve(null)
          return
        }

        const sx = Math.max(0, (vw - 320) / 2)
        const sy = Math.max(0, (vh - 240) / 2)
        ctx.drawImage(video, sx, sy, Math.min(320, vw), Math.min(240, vh), 0, 0, 320, 240)

        canvas.toBlob(
          (blob) => {
            if (resolved) return
            cleanup()
            if (blob) {
              console.log(`[Thumbnail] Successfully captured thumbnail for ${file.name}, size: ${blob.size} bytes`)
            } else {
              console.warn(`[Thumbnail] toBlob returned null for ${file.name}`)
            }
            resolve(blob)
          },
          'image/jpeg',
          0.7
        )
      } catch (err) {
        console.error(`[Thumbnail] Error in onseeked for ${file.name}:`, err)
        if (!resolved) {
          cleanup()
          resolve(null)
        }
      }
    }

    video.onerror = (e) => {
      if (!resolved) {
        console.error(`[Thumbnail] Video load error for ${file.name}:`, e, 'Error:', video.error?.message)
        cleanup()
        resolve(null)
      }
    }

    video.onpause = () => {
      console.log(`[Thumbnail] Video paused for ${file.name}`)
    }

    try {
      video.src = url
      video.load()
    } catch (err) {
      console.error(`[Thumbnail] Error setting video src for ${file.name}:`, err)
      cleanup()
      resolve(null)
    }
  })
}
