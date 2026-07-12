import ffmpeg from 'fluent-ffmpeg'
import { createReadStream, createWriteStream } from 'fs'
import { unlink } from 'fs/promises'
import path from 'path'
import os from 'os'

/**
 * Extract first frame dari video file sebagai thumbnail JPG
 * Returns buffer dari thumbnail image
 */
export async function extractVideoThumbnail(videoBuffer: Buffer, fileName: string): Promise<Buffer> {
  return new Promise(async (resolve, reject) => {
    const tmpDir = os.tmpdir()
    const videoPath = path.join(tmpDir, `video-${Date.now()}-${Math.random().toString(36).slice(2)}`)
    const thumbnailPath = path.join(tmpDir, `thumb-${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`)

    try {
      // Write buffer ke temporary file
      const writeStream = createWriteStream(videoPath)
      writeStream.write(videoBuffer)
      writeStream.end()

      writeStream.on('finish', () => {
        // Extract thumbnail menggunakan FFmpeg
        ffmpeg(videoPath)
          .on('error', (err) => {
            console.error('[FFmpeg] Error extracting thumbnail:', err)
            cleanup()
            reject(new Error(`Gagal extract thumbnail: ${err.message}`))
          })
          .on('end', async () => {
            try {
              // Read thumbnail JPG sebagai buffer
              const readStream = createReadStream(thumbnailPath)
              const chunks: Buffer[] = []

              readStream.on('data', (chunk) => chunks.push(chunk))
              readStream.on('end', () => {
                cleanup()
                resolve(Buffer.concat(chunks))
              })
              readStream.on('error', (err) => {
                cleanup()
                reject(err)
              })
            } catch (err) {
              cleanup()
              reject(err)
            }
          })
          .screenshots({
            timestamps: ['00:00:00.500'],
            filename: path.basename(thumbnailPath),
            folder: tmpDir,
            size: '320x240'
          })
      })

      writeStream.on('error', (err) => {
        console.error('[FFmpeg] Error writing temp video file:', err)
        cleanup()
        reject(err)
      })

      function cleanup() {
        unlink(videoPath).catch(() => {})
        unlink(thumbnailPath).catch(() => {})
      }
    } catch (err) {
      reject(err)
    }
  })
}
