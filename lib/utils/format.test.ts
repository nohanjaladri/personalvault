import { formatFileSize, formatDate } from './format'

describe('formatFileSize', () => {
  it('handles zero', () => expect(formatFileSize(0)).toBe('0 B'))
  it('formats KB', () => expect(formatFileSize(1_536)).toBe('1.5 KB'))
  it('formats MB', () => expect(formatFileSize(5 * 1_048_576)).toBe('5.0 MB'))
  it('formats GB', () => expect(formatFileSize(2.5 * 1_073_741_824)).toBe('2.50 GB'))
})

describe('formatDate', () => {
  it('returns Baru saja for < 1 hour', () => {
    const t = new Date(Date.now() - 10 * 60_000).toISOString()
    expect(formatDate(t)).toBe('Baru saja')
  })
  it('returns jam lalu', () => {
    const t = new Date(Date.now() - 3 * 3_600_000).toISOString()
    expect(formatDate(t)).toBe('3 jam lalu')
  })
  it('returns hari lalu', () => {
    const t = new Date(Date.now() - 2 * 86_400_000).toISOString()
    expect(formatDate(t)).toBe('2 hari lalu')
  })
  it('returns locale date for >= 7 days ago', () => {
    const t = new Date(Date.now() - 10 * 86_400_000).toISOString()
    expect(formatDate(t)).toMatch(/\d{1,2}\s\w+\s\d{4}/)
  })
})
