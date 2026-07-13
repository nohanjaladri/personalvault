/**
 * Capture video thumbnail client-side via <video> + <canvas>
 * preload=metadata untuk load cepat tanpa download full file.
 */
export function captureVideoThumbnail(file: File, seekTime = 1.0): Promise<Blob | null> {
  return new Promise((resolve) => {
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'metadata'
    video.crossOrigin = 'anonymous'

    const url = URL.createObjectURL(file)
    let timeoutId: ReturnType<typeof setTimeout> | null = null
    let resolved = false

    const cleanup = () => {
      if (timeoutId) clearTimeout(timeoutId)
      if (!resolved) URL.revokeObjectURL(url)
      resolved = true
    }

    // Timeout per video (big files may take time to parse headers)
    timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn(`[Thumbnail] Timeout loading video: ${file.name}`)
        cleanup()
        resolve(null)
      }
    }, 30000)

    video.onloadedmetadata = () => {
      try {
        if (resolved) return
        const duration = video.duration
        if (!duration || !isFinite(duration) || duration <= 0) {
          console.warn(`[Thumbnail] Invalid duration for ${file.name}: ${duration}`)
          // Try seeking to 0 anyway
          video.currentTime = 0
          return
        }
        const t = Math.min(seekTime, Math.max(0, duration - 0.1))
        console.log(`[Thumbnail] Metadata loaded ${file.name}, duration: ${duration}s, seeking to ${t}s`)
        video.currentTime = t
      } catch (err) {
        console.error(`[Thumbnail] Error in onloadedmetadata for ${file.name}:`, err)
      }
    }

    video.onseeked = () => {
      try {
        if (resolved) return

        const vw = video.videoWidth || 320
        const vh = video.videoHeight || 240
        if (vw === 0 || vh === 0) {
          console.warn(`[Thumbnail] Zero dimensions for ${file.name}, retrying seek to 0.5s`)
          // Retry once at later time
          video.currentTime = 0.5
          return
        }

        const canvas = document.createElement('canvas')
        canvas.width = 320
        canvas.height = 240
        const ctx = canvas.getContext('2d')
        if (!ctx) { cleanup(); resolve(null); return }

        // Center-crop
        const sx = Math.max(0, (vw - 320) / 2)
        const sy = Math.max(0, (vh - 240) / 2)
        ctx.drawImage(video, sx, sy, Math.min(320, vw), Math.min(240, vh), 0, 0, 320, 240)

        canvas.toBlob((blob) => {
          if (resolved) return
          cleanup()
          if (blob) {
            console.log(`[Thumbnail] Success ${file.name} -> ${blob.size} bytes`)
          } else {
            console.warn(`[Thumbnail] toBlob null for ${file.name}`)
          }
          resolve(blob)
        }, 'image/jpeg', 0.7)
      } catch (err) {
        console.error(`[Thumbnail] Error in onseeked for ${file.name}:`, err)
        if (!resolved) { cleanup(); resolve(null) }
      }
    }

    // Second seeked handler for retry on zero dimensions
    let retryCount = 0
    const origSeeked = video.onseeked
    video.onseeked = (e) => {
      try {
        if (resolved) return
        const vw = video.videoWidth || 0
        const vh = video.videoHeight || 0
        if (vw === 0 && vh === 0 && retryCount < 2) {
          retryCount++
          // Retry later - availability may increase after more data loads
          setTimeout(() => { video.currentTime = 1.0 }, 300 * retryCount)
          return
        }
        origSeeked!.call(video, e)
      } catch (err) {
        console.error(`[Thumbnail] Error in wrapped onseeked for ${file.name}:`, err)
        if (!resolved) { cleanup(); resolve(null) }
      }
    }

    video.onerror = () => {
      if (!resolved) {
        console.error(`[Thumbnail] Video error for ${file.name}:`, video.error?.message)
        cleanup()
        resolve(null)
      }
    }

    try {
      video.src = url
      video.load()
    } catch (err) {
      console.error(`[Thumbnail] Error setting src for ${file.name}:`, err)
      cleanup()
      resolve(null)
    }
  })
}

