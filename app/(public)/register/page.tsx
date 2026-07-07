'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isRegistered, setIsRegistered] = useState(false)
  const router = useRouter()

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
      <div className="min-h-screen bg-[#fafafa] flex flex-col">
        <div className="h-px bg-[#DC2626] w-full shrink-0" />
        <div className="flex flex-1">
          {/* Left column */}
          <div className="hidden lg:flex flex-col justify-between w-[56%] bg-[#111111] px-16 py-16">
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
          <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16">
            <div className="lg:hidden mb-10">
              <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
            </div>

            <div className="w-full max-w-sm space-y-8 animate-fade-in">
              <div>
                <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.16em] mb-3">
                  02 / 02
                </p>
                <h2 className="text-2xl font-black text-[#111111] leading-tight tracking-tight">
                  Cek email Anda
                </h2>
              </div>

              <div className="bg-white border border-[#e5e5e5] rounded p-6 space-y-5">
                <div className="w-8 h-8 bg-[#111111] rounded flex items-center justify-center shrink-0">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <rect x="1" y="3" width="12" height="9" rx="1" stroke="white" strokeWidth="1.5"/>
                    <path d="M1 4.5L7 8.5L13 4.5" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>

                <div className="space-y-1">
                  <p className="text-sm text-[#525252] leading-relaxed">
                    Kami mengirim tautan konfirmasi ke{' '}
                    <strong className="text-[#111111] font-semibold">{email}</strong>
                  </p>
                </div>

                <div className="bg-[#fafafa] border border-[#e5e5e5] rounded p-4">
                  <p className="text-xs text-[#737373] leading-relaxed">
                    Periksa folder <strong className="text-[#111111]">Inbox</strong> atau{' '}
                    <strong className="text-[#111111]">Spam / Junk</strong>, lalu klik tautan
                    verifikasi sebelum mencoba masuk.
                  </p>
                </div>

                <Link
                  href="/login"
                  className="btn-primary w-full py-3 text-sm"
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
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <div className="h-px bg-[#DC2626] w-full shrink-0" />

      <div className="flex flex-1">
        {/* ── Left column ── */}
        <div className="hidden lg:flex flex-col justify-between w-[56%] bg-[#111111] px-16 py-16">
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
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16">
          <div className="lg:hidden mb-10">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
          </div>

          <div className="w-full max-w-sm">
            <div className="mb-10">
              <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.16em] mb-3">
                01 / 02
              </p>
              <h2 className="text-2xl font-black text-[#111111] leading-tight tracking-tight">
                Buat akun baru
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="text-sm text-[#DC2626] bg-[#fef2f2] border border-[#fca5a5] rounded px-4 py-3 leading-relaxed">
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
                  className="input-field"
                  placeholder="username_anda"
                />
                <p className="text-[11px] text-[#a3a3a3] mt-2">
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
                  className="input-field"
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
                  className="input-field"
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
                  className="input-field"
                  placeholder="Ulangi password"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm mt-2"
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
              <div className="flex-1 h-px bg-[#e5e5e5]" />
              <span className="text-[10px] text-[#a3a3a3] uppercase tracking-widest">atau</span>
              <div className="flex-1 h-px bg-[#e5e5e5]" />
            </div>

            <p className="text-sm text-[#737373]">
              Sudah punya akun?{' '}
              <Link
                href="/login"
                className="text-[#111111] font-semibold underline underline-offset-4 hover:text-[#DC2626] transition-colors"
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
