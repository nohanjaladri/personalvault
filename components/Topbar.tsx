'use client'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import CreateNoteModal from './CreateNoteModal'
import { useTheme } from './ThemeProvider'

/* ── Icons ─────────────────────────────────────────────────── */
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

/* ── Sun icon (light mode) ──────────────────────────────────── */
const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

/* ── Moon icon (dark mode) ──────────────────────────────────── */
const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M12 8.5A5.5 5.5 0 0 1 5.5 2a5.5 5.5 0 1 0 6.5 6.5Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

export default function Topbar({ email }: { email: string }) {
  const [query, setQuery] = useState('')
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { theme, toggle } = useTheme()

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

      <header
        className="h-14 flex items-center gap-3 px-4 md:px-6 shrink-0 relative z-40 transition-colors duration-200"
        style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        {/* Mobile menu toggle */}
        <button
          onClick={() => window.dispatchEvent(new Event('toggle-sidebar'))}
          className="md:hidden theme-toggle"
          title="Buka menu navigasi"
          aria-label="Menu"
        >
          <IconMenu />
        </button>

        {/* Search */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-xs md:max-w-sm flex items-center gap-2 rounded px-3 py-2 transition-all duration-150"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = 'var(--text-1)'
            e.currentTarget.style.background = 'var(--surface)'
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'var(--surface-2)'
          }}
        >
          <span style={{ color: 'var(--text-4)' }} className="shrink-0">
            <IconSearch />
          </span>
          <input
            type="search"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari file..."
            className="bg-transparent border-none outline-none text-sm flex-1 min-w-0"
            style={{ color: 'var(--text-1)' }}
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

          {/* ── Dark mode toggle ── */}
          <button
            onClick={toggle}
            className="theme-toggle"
            title={theme === 'dark' ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
            aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? <IconSun /> : <IconMoon />}
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(prev => !prev)}
              className="w-8 h-8 rounded bg-[#111111] text-white flex items-center justify-center text-xs font-bold cursor-pointer hover:bg-[#333333] transition-colors shrink-0 dark:bg-[#f0f0f0] dark:text-[#111111] dark:hover:bg-[#d4d4d4]"
              aria-label="Profil"
              aria-expanded={isDropdownOpen}
            >
              {email.charAt(0).toUpperCase()}
            </button>

            {isDropdownOpen && (
              <div
                className="absolute right-0 mt-2 w-52 rounded py-1 z-50 animate-fade-in"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                }}
              >
                {/* User info */}
                <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--surface-2)' }}>
                  <p className="section-heading">Pengguna</p>
                  <p className="text-sm font-bold truncate mt-1.5" style={{ color: 'var(--text-1)' }}>
                    @{username || 'user'}
                  </p>
                  <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-3)' }} title={email}>
                    {email}
                  </p>
                </div>

                <button
                  onClick={() => { router.push('/dashboard'); setIsDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer"
                  style={{ color: 'var(--text-2)' }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.background = 'var(--surface-2)'
                    ;(e.target as HTMLElement).style.color = 'var(--text-1)'
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.background = 'transparent'
                    ;(e.target as HTMLElement).style.color = 'var(--text-2)'
                  }}
                >
                  Beranda Brankas
                </button>
                <button
                  onClick={() => { router.push('/settings'); setIsDropdownOpen(false) }}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer"
                  style={{ color: 'var(--text-2)' }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.background = 'var(--surface-2)'
                    ;(e.target as HTMLElement).style.color = 'var(--text-1)'
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.background = 'transparent'
                    ;(e.target as HTMLElement).style.color = 'var(--text-2)'
                  }}
                >
                  Pengaturan Profil
                </button>

                <div className="h-px my-1" style={{ background: 'var(--surface-2)' }} />

                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 text-xs transition-colors cursor-pointer font-medium"
                  style={{ color: '#DC2626' }}
                  onMouseEnter={e => {
                    (e.target as HTMLElement).style.background = 'var(--accent-bg)'
                  }}
                  onMouseLeave={e => {
                    (e.target as HTMLElement).style.background = 'transparent'
                  }}
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
