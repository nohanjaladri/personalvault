'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CreateNoteModal from './CreateNoteModal'

const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M10 10L13 13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const IconMenu = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <rect y="3" width="16" height="1.5" rx="0.75" fill="currentColor"/>
    <rect y="7.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
    <rect y="11.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
  </svg>
)

const IconUpload = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M6 8V1M3 3.5L6 1l3 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M1 9v1.5a.5.5 0 0 0 .5.5h9a.5.5 0 0 0 .5-.5V9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const IconFolder = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M1 3.5A1 1 0 0 1 2 2.5h2.586a1 1 0 0 1 .707.293L6 3.5h4a1 1 0 0 1 1 1v5a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V3.5Z"
      stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const IconNote = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <rect x="1.5" y="1.5" width="9" height="9" rx="1" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M3.5 4h5M3.5 6h5M3.5 8h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

export default function Topbar({ email }: { email: string }) {
  const [query, setQuery] = useState('')
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const router = useRouter()
  const supabase = createClient()

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
    setIsLoggingOut(true)
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const handleUploadComplete = () => {
    window.dispatchEvent(new Event('refresh-files'))
  }

  return (
    <>
      {/* Full-screen logout overlay */}
      {isLoggingOut && (
        <div className="fixed inset-0 z-[9999] bg-[#111111] flex flex-col items-center justify-center gap-4">
          <div className="w-6 h-6 border-2 border-[#333] border-t-white rounded-full animate-spinner-neon" />
          <span className="text-[10px] text-[#525252] font-semibold tracking-[0.16em] uppercase">
            Keluar...
          </span>
        </div>
      )}

      <header className="h-14 bg-white border-b border-[#e5e5e5] flex items-center gap-3 px-4 md:px-6 shrink-0 relative z-40">
        {/* Mobile menu toggle */}
        <button
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          className="md:hidden w-8 h-8 rounded flex items-center justify-center text-[#525252] hover:bg-[#f5f5f5] border border-[#e5e5e5] transition-colors cursor-pointer"
          title="Buka menu navigasi"
          aria-label="Menu"
        >
          <IconMenu />
        </button>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-xs md:max-w-sm flex items-center gap-2 bg-[#f5f5f5] border border-[#e5e5e5] rounded px-3 py-2 transition-all focus-within:border-[#111111] focus-within:bg-white"
        >
          <span className="text-[#a3a3a3] shrink-0">
            <IconSearch />
          </span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari file..."
            className="bg-transparent border-none outline-none text-[#111111] text-sm flex-1 placeholder:text-[#a3a3a3] min-w-0"
          />
        </form>

        {/* Right actions */}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => document.getElementById('file-input')?.click()}
            className="hidden md:flex btn-primary items-center gap-1.5 text-xs py-2 px-3 cursor-pointer"
          >
            <IconUpload />
            Upload
          </button>
          <button
            onClick={() => document.getElementById('folder-input')?.click()}
            className="hidden md:flex btn-ghost items-center gap-1.5 text-xs py-2 px-3 cursor-pointer"
          >
            <IconFolder />
            Folder
          </button>
          <button
            onClick={() => setIsNoteModalOpen(true)}
            className="hidden md:flex btn-ghost items-center gap-1.5 text-xs py-2 px-3 cursor-pointer"
          >
            <IconNote />
            Catatan
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="w-8 h-8 rounded bg-[#111111] text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-[#333333] transition-colors shrink-0"
              aria-label="Profil"
              aria-expanded={isDropdownOpen}
            >
              {email.charAt(0).toUpperCase()}
            </button>

            {isDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white border border-[#e5e5e5] rounded shadow-[0_4px_12px_rgba(0,0,0,0.08)] py-1 z-50 animate-fade-in">
                {/* User info */}
                <div className="px-4 py-3 border-b border-[#f5f5f5]">
                  <p className="section-heading text-[#a3a3a3]">Pengguna</p>
                  <p className="text-sm font-bold text-[#111111] truncate mt-1.5">
                    @{username || 'user'}
                  </p>
                  <p className="text-[11px] text-[#737373] truncate mt-0.5" title={email}>
                    {email}
                  </p>
                </div>

                <button
                  onClick={() => { router.push('/dashboard'); setIsDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#525252] hover:bg-[#f5f5f5] hover:text-[#111111] transition-colors cursor-pointer"
                >
                  Beranda Brankas
                </button>
                <button
                  onClick={() => { router.push('/settings'); setIsDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#525252] hover:bg-[#f5f5f5] hover:text-[#111111] transition-colors cursor-pointer"
                >
                  Pengaturan Profil
                </button>

                <div className="h-px bg-[#f5f5f5] my-1" />

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs text-[#DC2626] hover:bg-[#fef2f2] transition-colors cursor-pointer font-medium"
                >
                  Keluar
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
    </>
  )
}
