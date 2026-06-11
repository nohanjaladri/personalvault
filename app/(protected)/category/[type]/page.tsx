'use client'
import { useCallback, useEffect, useState } from 'react'
import { use } from 'react'
import FileGrid from '@/components/FileGrid'
import DropZone from '@/components/DropZone'
import { CATEGORY_EMOJI, CATEGORY_LABEL, type FileCategory } from '@/lib/utils/category'

type FileRow = { id: string; name: string; size: number; category: string; mime_type: string; created_at: string; is_starred: boolean }

export default function CategoryPage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = use(params)
  const [files, setFiles] = useState<FileRow[]>([])
  const [sort, setSort] = useState<'created_at' | 'size' | 'name'>('created_at')
  const [order, setOrder] = useState<'asc' | 'desc'>('desc')
  const [loading, setLoading] = useState(true)

  const fetchFiles = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/files?category=${type}&sort=${sort}&order=${order}`)
    setFiles(await res.json())
    setLoading(false)
  }, [type, sort, order])

  useEffect(() => { fetchFiles() }, [fetchFiles])

  const category = type as FileCategory
  const isValid = ['photo','video','audio','code','document','archive','other'].includes(category)
  if (!isValid) return <div className="text-slate-500 text-sm">Kategori tidak ditemukan.</div>

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <span className="text-3xl">{CATEGORY_EMOJI[category]}</span>
        <h1 className="text-xl font-bold text-slate-100">{CATEGORY_LABEL[category]}</h1>
        <span className="text-slate-500 text-sm ml-auto">{files.length} file</span>
      </div>

      <DropZone onUploadComplete={fetchFiles} />

      <div className="flex items-center gap-3 mb-3.5">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-600 mr-auto">File</p>
        <select
          value={sort}
          onChange={e => setSort(e.target.value as typeof sort)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-300 outline-none"
        >
          <option value="created_at">Tanggal</option>
          <option value="size">Ukuran</option>
          <option value="name">Nama</option>
        </select>
        <button
          onClick={() => setOrder(o => o === 'desc' ? 'asc' : 'desc')}
          className="action-btn text-xs"
        >
          {order === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-500 text-sm">Memuat...</div>
      ) : (
        <FileGrid files={files} onRefresh={fetchFiles} />
      )}
    </div>
  )
}
