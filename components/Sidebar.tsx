'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CATEGORY_EMOJI, CATEGORY_LABEL, type FileCategory } from '@/lib/utils/category'
import { formatFileSize } from '@/lib/utils/format'

import { useState, useEffect } from 'react'

const CATEGORIES: (FileCategory | 'all')[] = ['all','photo','video','audio','code','document','archive','other']

export default function Sidebar({ usedBytes }: { usedBytes: number }) {
  const path = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    const handleToggle = () => setIsOpen(prev => !prev)
    window.addEventListener('toggle-sidebar', handleToggle)
    return () => window.removeEventListener('toggle-sidebar', handleToggle)
  }, [])

  // Tutup sidebar otomatis saat rute berubah (pindah halaman di mobile)
  useEffect(() => {
    setIsOpen(false)
  }, [path])

  const links = [
    { href: '/dashboard', label: 'Semua File', icon: '📁' },
    ...CATEGORIES.filter(c => c !== 'all').map(c => ({
      href: `/category/${c}`,
      label: CATEGORY_LABEL[c],
      icon: CATEGORY_EMOJI[c],
    })),
    { href: '/settings', label: 'Pengaturan', icon: '⚙️' },
  ]

  const usedPct = Math.min((usedBytes / (10 * 1_073_741_824)) * 100, 100)

  return (
    <>
      {/* Dark overlay backdrop for mobile */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-45 md:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`fixed md:static inset-y-0 left-0 w-[240px] md:w-[220px] shrink-0 bg-[rgba(10,8,22,0.95)] md:bg-[rgba(10,8,22,0.65)] backdrop-blur-2xl border-r border-white/[0.07] flex flex-col gap-1.5 py-6 px-4 z-50 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}`}>
        <div className="flex items-center justify-between px-2 pb-5 border-b border-white/[0.07] mb-1.5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-lg shadow-[0_0_18px_rgba(139,92,246,0.55)]">
              🔐
            </div>
            <span className="font-bold text-base bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">
              PersonalVault
            </span>
          </div>
          {/* Tombol Tutup Mobile */}
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden text-slate-400 hover:text-white text-lg font-bold p-1 cursor-pointer"
          >
            &times;
          </button>
        </div>

        <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1 scrollbar-thin">
          {links.map(({ href, label, icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${path === href || (href !== '/dashboard' && path.startsWith(href)) ? 'nav-item-active' : ''}`}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </Link>
          ))}
        </nav>

        <div className="mt-auto bg-violet-500/[0.08] border border-violet-500/20 rounded-xl p-3.5">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Penyimpanan</span>
            <span className="text-violet-400">{formatFileSize(usedBytes)} / 10 GB</span>
          </div>
          <div className="h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(139,92,246,0.5)]"
              style={{ width: `${usedPct}%` }}
            />
          </div>
        </div>
      </aside>
    </>
  )
}
