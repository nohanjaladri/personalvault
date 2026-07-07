'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ShapeCanvas from '@/components/ShapeCanvas'
import { useTheme } from '@/components/ThemeProvider'

/* Sun icon (light mode) */
const IconSun = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M7 1v1.5M7 11.5V13M1 7h1.5M11.5 7H13M2.93 2.93l1.06 1.06M10.01 10.01l1.06 1.06M2.93 11.07l1.06-1.06M10.01 3.99l1.06-1.06"
      stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
  </svg>
)

const IconMoon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path d="M12 8.5A5.5 5.5 0 0 1 5.5 2a5.5 5.5 0 1 0 6.5 6.5Z"
      stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round"/>
  </svg>
)

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const { theme, toggle } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()

    const isEmail = identifier.includes('@')
    let loginEmail = identifier

    if (!isEmail) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', identifier.trim().toLowerCase())
        .maybeSingle()

      if (!profile?.email) {
        setError('Username tidak ditemukan')
        setLoading(false)
        return
      }
      loginEmail = profile.email
    }

    const { error: err } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password,
    })

    if (err) {
      setError('Email / username atau password salah')
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex flex-col transition-colors duration-200 relative overflow-hidden" style={{ background: 'var(--bg)' }}>
      <ShapeCanvas />
      
      {/* Dark mode switch */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={toggle}
          className="theme-toggle"
          title={theme === 'dark' ? 'Beralih ke Light Mode' : 'Beralih ke Dark Mode'}
          aria-label={theme === 'dark' ? 'Light mode' : 'Dark mode'}
        >
          {theme === 'dark' ? <IconSun /> : <IconMoon />}
        </button>
      </div>

      {/* Top rule — red accent line */}
      <div className="h-px bg-[#DC2626] w-full shrink-0 z-10" />

      <div className="flex flex-1 relative z-10">
        {/* ── Left column: typographic statement ── */}
        <div className="hidden lg:flex flex-col justify-between w-[56%] bg-[#111111]/90 backdrop-blur-sm px-16 py-16">
          {/* Wordmark */}
          <div>
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
          </div>

          {/* Main copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold text-[#525252] uppercase tracking-[0.16em]">
                Personal Vault — Secure Storage
              </p>
              <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
                Your files.<br />
                Private.<br />
                <span className="text-[#DC2626]">Always.</span>
              </h1>
            </div>

            <p className="text-sm text-[#737373] leading-relaxed max-w-xs">
              Simpan, kelola, dan bagikan file pribadi Anda dengan kontrol penuh. 
              Tidak ada pihak ketiga. Tidak ada iklan. Hanya Anda dan data Anda.
            </p>

            {/* Feature list */}
            <div className="space-y-3 pt-4 border-t border-[#222222]">
              {[
                ['01', 'Enkripsi end-to-end'],
                ['02', 'Berbagi file dengan tautan aman'],
                ['03', 'Hingga 10 GB penyimpanan gratis'],
              ].map(([num, label]) => (
                <div key={num} className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-[#DC2626] font-mono">{num}</span>
                  <span className="text-xs text-[#737373]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom footnote */}
          <div>
            <p className="text-[10px] text-[#404040]">
              &copy; {new Date().getFullYear()} Personal Vault — Swiss Design System
            </p>
          </div>
        </div>

        {/* ── Right column: login form ── */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 backdrop-blur-md bg-[var(--bg)]/85" style={{ background: 'transparent' }}>
          {/* Mobile wordmark */}
          <div className="lg:hidden mb-10">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
          </div>

          <div className="w-full max-w-sm animate-slide-in">
            {/* Header */}
            <div className="mb-10">
              <p className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-[0.16em] mb-3">
                Akses Akun
              </p>
              <h2 className="text-2xl font-black text-[var(--text-1)] leading-tight tracking-tight">
                Masuk ke Vault
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-sm text-[#DC2626] bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded px-4 py-3 leading-relaxed">
                  {error}
                </div>
              )}

              <div>
                <label className="label">Username / Email</label>
                <input
                  type="text"
                  id="identifier"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  required
                  autoComplete="username"
                  className="input-field transition-all duration-150 focus:scale-[1.01]"
                  placeholder="username atau nama@email.com"
                />
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  id="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="input-field transition-all duration-150 focus:scale-[1.01]"
                  placeholder="Password Anda"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm transition-all duration-150 active:scale-[0.98] hover:shadow-lg hover:shadow-black/10"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spinner-neon" />
                    Masuk...
                  </span>
                ) : 'Masuk'}
              </button>
            </form>

            {/* Divider */}
            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[10px] text-[var(--text-4)] uppercase tracking-widest">atau</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <p className="text-sm text-[var(--text-3)]">
              Belum punya akun?{' '}
              <Link
                href="/register"
                className="text-[var(--text-1)] font-semibold underline underline-offset-4 hover:text-[#DC2626] transition-colors"
              >
                Daftar gratis
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
