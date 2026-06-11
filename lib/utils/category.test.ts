import { detectCategory } from './category'

describe('detectCategory', () => {
  it('returns photo for image types', () => {
    expect(detectCategory('image/jpeg')).toBe('photo')
    expect(detectCategory('image/png')).toBe('photo')
    expect(detectCategory('image/webp')).toBe('photo')
  })
  it('returns video for video types', () => {
    expect(detectCategory('video/mp4')).toBe('video')
    expect(detectCategory('video/x-matroska')).toBe('video')
  })
  it('returns audio for audio types', () => {
    expect(detectCategory('audio/mpeg')).toBe('audio')
    expect(detectCategory('audio/wav')).toBe('audio')
  })
  it('returns document for pdf and office docs', () => {
    expect(detectCategory('application/pdf')).toBe('document')
    expect(detectCategory('application/msword')).toBe('document')
    expect(detectCategory('application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe('document')
  })
  it('returns archive for compressed files', () => {
    expect(detectCategory('application/zip')).toBe('archive')
    expect(detectCategory('application/x-7z-compressed')).toBe('archive')
    expect(detectCategory('application/x-rar-compressed')).toBe('archive')
  })
  it('returns code for text and json', () => {
    expect(detectCategory('text/plain')).toBe('code')
    expect(detectCategory('text/html')).toBe('code')
    expect(detectCategory('application/json')).toBe('code')
  })
  it('returns other for unknown types', () => {
    expect(detectCategory('application/octet-stream')).toBe('other')
  })
})
