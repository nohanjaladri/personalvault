import Link from 'next/link'
import { CATEGORY_LABEL, type FileCategory } from '@/lib/utils/category'
import { formatFileSize } from '@/lib/utils/format'

type CategoryStat = { category: string; count: number; totalSize: number }

/* Category data: icon chars + neutral treatment */
const CATEGORY_CHARS: Record<string, string> = {
  photo: '▣',
  video: '▷',
  audio: '♪',
  code: '</>',
  document: '≡',
  archive: '▦',
  other: '◈',
}

export default function CategoryCards({ stats }: { stats: CategoryStat[] }) {
  const categories: FileCategory[] = ['photo', 'video', 'audio', 'code', 'document', 'archive', 'other']

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
      {categories.map(cat => {
        const stat = stats.find(s => s.category === cat)
        const count = stat?.count ?? 0

        return (
          <Link
            key={cat}
            href={`/category/${cat}`}
            className="group file-card flex flex-col gap-3 p-4 transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_8px_16px_rgba(0,0,0,0.06)]"
          >
            {/* Icon char */}
            <span className="text-[13px] font-mono text-[#a3a3a3] group-hover:text-[var(--text-1)] transition-colors select-none">
              {CATEGORY_CHARS[cat]}
            </span>

            {/* Label */}
            <div>
              <p className="text-sm font-semibold text-[var(--text-1)] leading-tight">
                {CATEGORY_LABEL[cat]}
              </p>
              <p className="text-xs text-[#a3a3a3] mt-1 tabular-nums">
                {count} file
                {stat && stat.totalSize > 0 && (
                  <> &nbsp;·&nbsp; {formatFileSize(stat.totalSize)}</>
                )}
              </p>
            </div>

            {/* Red accent line on bottom: shows only on hover */}
            <div className="h-[2px] bg-[#DC2626] scale-x-0 group-hover:scale-x-100 transition-transform duration-300 ease-out origin-left mt-auto" />
          </Link>
        )
      })}
    </div>
  )
}
