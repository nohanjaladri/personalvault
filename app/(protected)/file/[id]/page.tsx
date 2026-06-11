import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FilePreview from '@/components/FilePreview'
import { CATEGORY_EMOJI } from '@/lib/utils/category'
import { formatDate, formatFileSize } from '@/lib/utils/format'
import Link from 'next/link'
import DownloadButton from './DownloadButton'

export default async function FilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: file } = await supabase.from('files').select('*').eq('id', id).eq('user_id', user.id).single()
  if (!file) notFound()

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard" className="text-slate-500 hover:text-slate-300 transition-colors text-sm">← Kembali</Link>
      </div>
      <div className="glass-card p-6 mb-4">
        <div className="flex items-start gap-4 mb-5">
          <span className="text-4xl">{CATEGORY_EMOJI[file.category as keyof typeof CATEGORY_EMOJI] ?? '📎'}</span>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold text-slate-100 break-all">{file.name}</h1>
            <div className="flex gap-4 mt-1 text-xs text-slate-500">
              <span>{formatFileSize(file.size)}</span>
              <span>{file.mime_type}</span>
              <span>{formatDate(file.created_at)}</span>
            </div>
          </div>
          <DownloadButton r2Key={file.r2_key} driveFileId={file.drive_file_id} fileName={file.name} />
        </div>
        <FilePreview r2Key={file.r2_key} driveFileId={file.drive_file_id} mimeType={file.mime_type} fileName={file.name} />
      </div>
    </div>
  )
}
