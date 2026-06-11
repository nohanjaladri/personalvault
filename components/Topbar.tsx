'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CreateNoteModal from './CreateNoteModal'

export default function Topbar({ email }: { email: string }) {
  const [query, setQuery] = useState('')
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [username, setUsername] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const supabase = createClient()

  // Fetch username dari data profil
  useEffect(() => {
    supabase
      .from('profiles')
      .select('username')
      .eq('email', email)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.username) setUsername(data.username)
      })
  }, [email, supabase])

  // Tutup dropdown jika klik di luar komponen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) router.push(`/dashboard?q=${encodeURIComponent(query.trim())}`)
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleUploadComplete = () => {
    window.dispatchEvent(new Event('refresh-files'))
  }

  return (
    <header className="h-16 bg-[rgba(10,8,22,0.55)] backdrop-blur-2xl border-b border-white/[0.06] flex items-center gap-3 px-4 md:px-7 shrink-0 relative z-40">
      {/* Mobile Menu Button (Hamburger) */}
      <button
        onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
        className="md:hidden w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
        title="Buka menu navigasi"
      >
        ☰
      </button>

      <form onSubmit={handleSearch} className="flex-1 max-w-xs md:max-w-md flex items-center gap-2 bg-white/5 border border-white/[0.09] rounded-xl px-3 py-1.5 md:px-3.5 md:py-2 transition-all duration-200 focus-within:border-violet-500/50 focus-within:bg-violet-500/[0.08] focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.1)]">
        <span className="text-slate-500 text-xs md:text-sm">🔍</span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Cari file..."
          className="bg-transparent border-none outline-none text-slate-200 text-xs md:text-sm flex-1 placeholder:text-slate-600"
        />
      </form>
 
      <div className="ml-auto flex items-center gap-2">
        <button
          onClick={() => document.getElementById('file-input')?.click()}
          className="hidden md:flex btn-primary items-center gap-2 text-xs font-semibold py-2 px-3.5 shadow-[0_0_12px_rgba(139,92,246,0.3)] cursor-pointer"
        >
          📄 Upload Berkas
        </button>
        <button
          onClick={() => document.getElementById('folder-input')?.click()}
          className="hidden md:flex px-3.5 py-2 text-xs font-semibold rounded-xl bg-violet-600/15 hover:bg-violet-600/30 text-violet-400 border border-violet-500/20 hover:border-violet-500/40 transition-all items-center gap-1.5 cursor-pointer shadow-md"
        >
          📁 Upload Folder
        </button>
 
        {/* Dropdown Profil */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(prev => !prev)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-sm font-bold cursor-pointer shadow-[0_0_12px_rgba(139,92,246,0.4)] hover:scale-105 transition-all focus:ring-2 focus:ring-violet-500/50"
          >
            {email.charAt(0).toUpperCase()}
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 mt-2.5 w-56 rounded-2xl bg-[#0e0c1a]/95 backdrop-blur-3xl border border-white/[0.08] shadow-[0_12px_32px_rgba(0,0,0,0.6),0_0_24px_rgba(139,92,246,0.06)] py-2.5 overflow-hidden origin-top-right">
              {/* Header Info */}
              <div className="px-4 py-2 border-b border-white/[0.06] mb-1.5 pb-2.5">
                <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Pengguna</p>
                <p className="text-sm font-bold text-slate-200 truncate mt-1">@{username || 'user'}</p>
                <p className="text-[10px] text-slate-400 truncate mt-0.5" title={email}>{email}</p>
              </div>

              {/* Menu Navigasi */}
              <button
                onClick={() => { router.push('/dashboard'); setIsDropdownOpen(false) }}
                className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-violet-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                📁 Beranda Brankas
              </button>
              <button
                onClick={() => { router.push('/settings'); setIsDropdownOpen(false) }}
                className="w-full text-left px-4 py-2 text-xs text-slate-300 hover:bg-white/[0.04] hover:text-violet-400 transition-colors flex items-center gap-2 cursor-pointer"
              >
                ⚙️ Pengaturan Profil
              </button>

              <div className="h-[1px] bg-white/[0.06] my-1.5" />

              {/* Tombol Keluar */}
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2 font-medium cursor-pointer"
              >
                🚪 Keluar (Log Out)
              </button>
            </div>
          )}
        </div>
      </div>

      <CreateNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        onUploadComplete={handleUploadComplete}
      />
    </header>
  )
}
