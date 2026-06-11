export type FileCategory = 'photo' | 'video' | 'audio' | 'code' | 'document' | 'archive' | 'other'

export function detectCategory(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'photo'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (
    mimeType === 'application/pdf' ||
    mimeType.startsWith('application/msword') ||
    mimeType.startsWith('application/vnd.openxmlformats-officedocument') ||
    mimeType.startsWith('application/vnd.ms-')
  ) return 'document'
  if (
    mimeType === 'application/zip' ||
    mimeType === 'application/x-rar-compressed' ||
    mimeType === 'application/x-7z-compressed' ||
    mimeType === 'application/gzip' ||
    mimeType === 'application/x-tar'
  ) return 'archive'
  if (
    mimeType.startsWith('text/') ||
    mimeType === 'application/json' ||
    mimeType === 'application/javascript' ||
    mimeType === 'application/xml'
  ) return 'code'
  return 'other'
}

export const CATEGORY_LABEL: Record<FileCategory | 'all', string> = {
  all: 'Semua', photo: 'Foto', video: 'Video', audio: 'Audio',
  code: 'Kode', document: 'Dokumen', archive: 'Arsip', other: 'Lainnya',
}

export const CATEGORY_EMOJI: Record<FileCategory | 'all', string> = {
  all: '📁', photo: '🖼️', video: '🎬', audio: '🎵',
  code: '💻', document: '📄', archive: '📦', other: '📎',
}

export const CATEGORY_COLOR: Record<FileCategory | 'all', string> = {
  all:      'rgba(139,92,246,',
  photo:    'rgba(139,92,246,',
  video:    'rgba(236,72,153,',
  audio:    'rgba(245,158,11,',
  code:     'rgba(59,130,246,',
  document: 'rgba(16,185,129,',
  archive:  'rgba(239,68,68,',
  other:    'rgba(100,116,139,',
}
