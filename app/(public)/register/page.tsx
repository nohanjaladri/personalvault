'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import ShapeCanvas from '@/components/ShapeCanvas'
import { useTheme } from '@/components/ThemeProvider'

/* Sun/Moon icons for theme toggle */
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

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const router = useRouter()
  const { theme, toggle } = useTheme()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUsername = username.trim().toLowerCase()

    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUsername)) {
      setError('Username harus 3–20 karakter, hanya huruf, angka, - dan _')
      return
    }
    if (password !== confirm) { setError('Password tidak cocok'); return }
    if (password.length < 8) { setError('Password minimal 8 karakter'); return }

    setLoading(true); setError('')
    const supabase = createClient()

    const { data, error: err } = await supabase.auth.signUp({ email, password })
    if (err) { setError(err.message); setLoading(false); return }

    if (data.user) {
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username: cleanUsername, email })

      if (profileErr) {
        setError(`Pendaftaran berhasil, namun gagal membuat profil: ${profileErr.message}`)
        setLoading(false)
        return
      }
    }

    setIsRegistered(true)
    setLoading(false)
  }

  /* ── Success state ── */
  if (isRegistered) {
    return (
      <div className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-200" style={{ background: 'var(--bg)' }}>
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

        <div className="h-px bg-[#DC2626] w-full shrink-0 z-10" />
        <div className="flex flex-1 relative z-10">
          {/* Left column */}
          <div className="hidden lg:flex flex-col justify-between w-[56%] bg-[#111111]/90 backdrop-blur-sm px-16 py-16">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
            <div className="space-y-6">
              <p className="text-[10px] font-semibold text-[#525252] uppercase tracking-[0.16em]">
                Langkah 02 — Verifikasi
              </p>
              <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
                Satu langkah<br />
                lagi menuju<br />
                <span className="text-[#DC2626]">Vault Anda.</span>
              </h1>
              <p className="text-sm text-[#737373] max-w-xs leading-relaxed">
                Periksa email Anda dan klik tautan verifikasi untuk mengaktifkan akun.
              </p>
            </div>
            <p className="text-[10px] text-[#404040]">
              &copy; {new Date().getFullYear()} Personal Vault
            </p>
          </div>

          {/* Right column */}
          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 backdrop-blur-md bg-[var(--bg)]/85">
            <div className="lg:hidden mb-10">
              <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
            </div>

            <div className="w-full max-w-sm space-y-8 animate-fade-in">
              <div>
                <p className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-[0.16em] mb-3">
                  02 / 02
                </p>
                <h2 className="text-2xl font-black text-[var(--text-1)] leading-tight tracking-tight">
                  Cek email Anda
                </h2>
              </div>

              <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-6 space-y-5">
                <div className="w-8 h-8 bg-[var(--text-1)] rounded flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="3" width="12" height="9" rx="1" stroke="var(--bg)" strokeWidth="1.5"/>
                    <path d="M1 4.5L7 8.5L13 4.5" stroke="var(--bg)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-[var(--text-2)] leading-relaxed">
                    Kami mengirim tautan konfirmasi ke{' '}
                    <strong className="text-[var(--text-1)] font-semibold">{email}</strong>
                  </p>
                </div>

                <div className="bg-[var(--surface-2)] border border-[var(--border)] rounded p-4">
                  <p className="text-xs text-[var(--text-3)] leading-relaxed">
                    Periksa folder <strong className="text-[var(--text-1)]">Inbox</strong> atau{' '}
                    <strong className="text-[var(--text-1)]">Spam / Junk</strong>, lalu klik tautan
                    verifikasi sebelum mencoba masuk.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="btn-primary w-full py-3 text-sm transition-all duration-150 active:scale-[0.98]"
                >
                  Kembali ke Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  /* ── Registration form ── */
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden transition-colors duration-200" style={{ background: 'var(--bg)' }}>
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

      <div className="h-px bg-[#DC2626] w-full shrink-0 z-10" />

      <div className="flex flex-1 relative z-10">
        {/* ── Left column ── */}
        <div className="hidden lg:flex flex-col justify-between w-[56%] bg-[#111111]/90 backdrop-blur-sm px-16 py-16">
          <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>

          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] font-semibold text-[#525252] uppercase tracking-[0.16em]">
                Langkah 01 — Buat Akun
              </p>
              <h1 className="text-5xl font-black text-white leading-[1.05] tracking-tight">
                Mulai simpan<br />
                file Anda<br />
                <span className="text-[#DC2626]">hari ini.</span>
              </h1>
            </div>

            <p className="text-sm text-[#737373] leading-relaxed max-w-xs">
              Daftar gratis dan dapatkan 10 GB penyimpanan pribadi yang aman, 
              terenkripsi, dan sepenuhnya milik Anda.
            </p>

            <div className="space-y-3 pt-4 border-t border-[#222222]">
              {[
                ['01', 'Buat akun dengan email'],
                ['02', 'Verifikasi via tautan email'],
                ['03', 'Mulai upload file pertama'],
              ].map(([num, label]) => (
                <div key={num} className="flex items-center gap-4">
                  <span className="text-[10px] font-bold text-[#DC2626] font-mono">{num}</span>
                  <span className="text-xs text-[#737373]">{label}</span>
                </div>
              ))}
            </div>
          </div>

          <p className="text-[10px] text-[#404040]">
            &copy; {new Date().getFullYear()} Personal Vault — Swiss Design System
          </p>
        </div>

        {/* ── Right column: form ── */}
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16 backdrop-blur-md bg-[var(--bg)]/85">
          <div className="lg:hidden mb-10">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
          </div>

          <div className="w-full max-w-sm animate-slide-in">
            <div className="mb-10">
              <p className="text-[10px] font-semibold text-[var(--text-4)] uppercase tracking-[0.16em] mb-3">
                01 / 02
              </p>
              <h2 className="text-2xl font-black text-[var(--text-1)] leading-tight tracking-tight">
                Buat akun baru
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-[#DC2626] bg-[var(--accent-bg)] border border-[var(--accent-border)] rounded px-4 py-3 leading-relaxed">
                  {error}
                </div>
              )}

              <div>
                <label className="label" htmlFor="username">Username</label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  autoComplete="username"
                  className="input-field transition-all duration-150 focus:scale-[1.01]"
                  placeholder="username_anda"
                />
                <p className="text-[11px] text-[var(--text-4)] mt-2">
                  3–20 karakter. Huruf, angka, - dan _ saja.
                </p>
              </div>

              <div>
                <label className="label" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="input-field transition-all duration-150 focus:scale-[1.01]"
                  placeholder="nama@email.com"
                />
              </div>

              <div>
                <label className="label" htmlFor="password">Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="input-field transition-all duration-150 focus:scale-[1.01]"
                  placeholder="Min. 8 karakter"
                />
              </div>

              <div>
                <label className="label" htmlFor="confirm">Konfirmasi Password</label>
                <input
                  id="confirm"
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  autoComplete="new-password"
                  className="input-field transition-all duration-150 focus:scale-[1.01]"
                  placeholder="Ulangi password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm mt-2 transition-all duration-150 active:scale-[0.98] hover:shadow-lg hover:shadow-black/10"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spinner-neon" />
                    Mendaftar...
                  </span>
                ) : 'Buat Akun'}
              </button>
            </form>

            <div className="flex items-center gap-4 my-8">
              <div className="flex-1 h-px bg-[var(--border)]" />
              <span className="text-[10px] text-[var(--text-4)] uppercase tracking-widest">atau</span>
              <div className="flex-1 h-px bg-[var(--border)]" />
            </div>

            <p className="text-sm text-[var(--text-3)]">
              Sudah punya akun?{' '}
              <Link
                href="/login"
                className="text-[var(--text-1)] font-semibold underline underline-offset-4 hover:text-[#DC2626] transition-colors"
              >
                Masuk
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
