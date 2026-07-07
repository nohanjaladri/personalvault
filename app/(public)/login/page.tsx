'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

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
    <div className="min-h-screen flex flex-col transition-colors duration-200" style={{ background: 'var(--bg)' }}>
      {/* Top rule — red accent line */}
      <div className="h-px bg-[#DC2626] w-full shrink-0" />

      <div className="flex flex-1">
        {/* ── Left column: typographic statement ── */}
        <div className="hidden lg:flex flex-col justify-between w-[56%] bg-[#111111] px-16 py-16">
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
        <div className="flex-1 flex flex-col justify-center px-8 sm:px-12 lg:px-16 py-16" style={{ background: 'var(--bg)' }}>
          {/* Mobile wordmark */}
          <div className="lg:hidden mb-10">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em]">Vault</span>
          </div>

          <div className="w-full max-w-sm">
            {/* Header */}
            <div className="mb-10">
              <p className="text-[10px] font-semibold text-[#a3a3a3] uppercase tracking-[0.16em] mb-3">
                Akses Akun
              </p>
              <h2 className="text-2xl font-black text-[#111111] leading-tight tracking-tight">
                Masuk ke Vault
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="text-sm text-[#DC2626] bg-[#fef2f2] border border-[#fca5a5] rounded px-4 py-3 leading-relaxed">
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
                  className="input-field"
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
                  className="input-field"
                  placeholder="Password Anda"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 text-sm"
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
              <div className="flex-1 h-px bg-[#e5e5e5]" />
              <span className="text-[10px] text-[#a3a3a3] uppercase tracking-widest">atau</span>
              <div className="flex-1 h-px bg-[#e5e5e5]" />
            </div>

            <p className="text-sm text-[#737373]">
              Belum punya akun?{' '}
              <Link
                href="/register"
                className="text-[#111111] font-semibold underline underline-offset-4 hover:text-[#DC2626] transition-colors"
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
