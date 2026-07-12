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

    video.onloadedmetadata = () => {
      const t = Math.min(seekTime, (video.duration || 1) - 0.1)
      video.currentTime = Math.max(0, t)
    }

    video.onseeked = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 320
      canvas.height = 240

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(url)
        resolve(null)
        return
      }

      // Draw with aspect-ratio fit (center-crop)
      const vw = video.videoWidth || 320
      const vh = video.videoHeight || 240
      const sx = Math.max(0, (vw - 320) / 2)
      const sy = Math.max(0, (vh - 240) / 2)
      ctx.drawImage(video, sx, sy, Math.min(320, vw), Math.min(240, vh), 0, 0, 320, 240)

      canvas.toBlob(
        (blob) => {
          URL.revokeObjectURL(url)
          resolve(blob)
        },
        'image/jpeg',
        0.7
      )
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }

    video.src = url
    video.load()
  })
}
