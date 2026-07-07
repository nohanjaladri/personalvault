'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CATEGORY_EMOJI, CATEGORY_LABEL, type FileCategory } from '@/lib/utils/category'
import { formatFileSize } from '@/lib/utils/format'
import { useState, useEffect } from 'react'

const CATEGORIES: (FileCategory | 'all')[] = ['all', 'photo', 'video', 'audio', 'code', 'document', 'archive', 'other']

/* SVG icons — inline, no external deps */
const IconGrid = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <rect x="0.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="7.5" y="0.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="0.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
    <rect x="7.5" y="7.5" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
)

const IconSettings = () => (
  <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
    <circle cx="6.5" cy="6.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M6.5 1v1M6.5 11v1M11 6.5h1M1 6.5H2M9.54 3.46l.71-.71M2.75 10.25l.71-.71M9.54 9.54l.71.71M2.75 2.75l.71.71"
      stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
  </svg>
)

const CATEGORY_ICONS: Record<string, string> = {
  all: '□', photo: '▣', video: '▷', audio: '♪',
  code: '</>', document: '≡', archive: '▦', other: '◈',
}

export default function Sidebar({ usedBytes }: { usedBytes: number }) {
  const path = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  useEffect(() => {
    setIsOpen(false)
  }, [path])

  const links = [
    { href: '/dashboard', label: 'Semua File', IconEl: <IconGrid /> },
    ...CATEGORIES.filter(c => c !== 'all').map(c => ({
      href: `/category/${c}`,
      label: CATEGORY_LABEL[c],
      IconEl: <span className="text-[11px] leading-none">{CATEGORY_ICONS[c]}</span>,
    })),
    { href: '/settings', label: 'Pengaturan', IconEl: <IconSettings /> },
  ]

  const usedPct = Math.min((usedBytes / (10 * 1_073_741_824)) * 100, 100)

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
        />
      )}

      <aside
        className={`
          fixed md:static inset-y-0 left-0 w-[208px] md:w-[200px] shrink-0
          bg-[#111111] text-white flex flex-col z-50
          transform transition-transform duration-200 ease-out
          border-r border-[#1e1e1e]
          ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        {/* ── Wordmark ── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            {/* Logo mark: red square */}
            <div className="w-5 h-5 bg-[#DC2626] rounded-sm flex items-center justify-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                <rect x="1" y="1" width="3.5" height="3.5" fill="white" rx="0.5"/>
                <rect x="5.5" y="1" width="3.5" height="3.5" fill="white" rx="0.5"/>
                <rect x="1" y="5.5" width="3.5" height="3.5" fill="white" rx="0.5"/>
                <rect x="5.5" y="5.5" width="3.5" height="3.5" fill="white" opacity="0.4" rx="0.5"/>
              </svg>
            </div>
            <span className="text-sm font-bold text-white tracking-tight">Vault</span>
          </div>

          {/* Mobile close */}
          <button
            onClick={() => setIsOpen(false)}
            className="md:hidden text-[#525252] hover:text-white text-lg font-bold cursor-pointer leading-none"
          >
            &times;
          </button>
        </div>

        {/* ── Navigation ── */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-px">
          {/* Section label */}
          <p className="section-heading text-[#404040] px-3 pt-1 pb-3">Navigasi</p>

          {links.map(({ href, label, IconEl }) => {
            const isActive = href === '/dashboard'
              ? path === href
              : path === href || path.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive ? 'nav-item-active' : ''}`}
              >
                <span className="w-4 shrink-0 flex items-center justify-center opacity-70">
                  {IconEl}
                </span>
                <span className="text-[13px]">{label}</span>
              </Link>
            )
          })}
        </nav>

        {/* ── Storage indicator ── */}
        <div className="px-5 py-5 border-t border-[#1e1e1e]">
          <div className="flex justify-between items-center mb-2">
            <span className="section-heading text-[#404040]">Penyimpanan</span>
            <span className="text-[10px] font-bold text-[#DC2626]">{usedPct.toFixed(0)}%</span>
          </div>

          {/* Progress track */}
          <div className="h-[3px] bg-[#2a2a2a] rounded-sm overflow-hidden">
            <div
              className="h-full bg-[#DC2626] transition-all duration-500"
              style={{ width: `${usedPct}%` }}
            />
          </div>

          <div className="flex justify-between mt-2">
            <p className="text-[10px] text-[#404040]">{formatFileSize(usedBytes)}</p>
            <p className="text-[10px] text-[#404040]">10 GB</p>
          </div>
        </div>
      </aside>
    </>
  )
}
