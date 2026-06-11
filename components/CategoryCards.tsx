import Link from 'next/link'
import { CATEGORY_COLOR, CATEGORY_EMOJI, CATEGORY_LABEL, type FileCategory } from '@/lib/utils/category'
import { formatFileSize } from '@/lib/utils/format'

type CategoryStat = { category: string; count: number; totalSize: number }

export default function CategoryCards({ stats }: { stats: CategoryStat[] }) {
  const categories: FileCategory[] = ['photo','video','audio','code','document','archive','other']

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 mb-7">
      {categories.map(cat => {
        const stat = stats.find(s => s.category === cat)
        const color = CATEGORY_COLOR[cat]
        return (
          <Link
            key={cat}
            href={`/category/${cat}`}
            className="file-card group"
            style={{ background: `${color}0.06)`, borderColor: `${color}0.18)` }}
          >
            <span className="text-2xl block mb-2">{CATEGORY_EMOJI[cat]}</span>
            <div className="font-semibold text-sm" style={{ color: `${color}1)` }}>{CATEGORY_LABEL[cat]}</div>
            <div className="text-slate-500 text-xs mt-1">{stat?.count ?? 0} file</div>
            {stat && stat.totalSize > 0 && (
              <div className="text-xs mt-0.5" style={{ color: `${color}0.6)` }}>{formatFileSize(stat.totalSize)}</div>
            )}
          </Link>
        )
      })}
    </div>
  )
}
