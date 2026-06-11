export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  if (bytes < 1_024) return `${bytes} B`
  if (bytes < 1_048_576) return `${(bytes / 1_024).toFixed(1)} KB`
  if (bytes < 1_073_741_824) return `${(bytes / 1_048_576).toFixed(1)} MB`
  return `${(bytes / 1_073_741_824).toFixed(2)} GB`
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const diffMs = Date.now() - date.getTime()
  const diffH = diffMs / 3_600_000
  const diffD = diffMs / 86_400_000
  if (diffH < 1) return 'Baru saja'
  if (diffH < 24) return `${Math.floor(diffH)} jam lalu`
  if (diffD < 7) return `${Math.floor(diffD)} hari lalu`
  return date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}
