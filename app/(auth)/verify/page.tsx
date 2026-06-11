'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function VerifyPage() {
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [cooldown, setCooldown] = useState(0)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const load = async () => {
      const supabase = createClient()
      const { data } = await supabase.auth.mfa.listFactors()
      if (data?.totp?.[0]) setFactorId(data.totp[0].id)
    }
    load()
  }, [])

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setInterval(() => setCooldown(c => c - 1), 1000)
    return () => clearInterval(t)
  }, [cooldown])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    if (cooldown > 0) return
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) { setError('Gagal membuat challenge'); setLoading(false); return }
    const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    if (err) {
      const next = attempts + 1
      setAttempts(next)
      if (next >= 3) { setCooldown(30); setAttempts(0) }
      setError('Kode salah. Coba lagi.'); setLoading(false); return
    }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl mx-auto mb-4 shadow-[0_0_24px_rgba(139,92,246,0.5)]">🔑</div>
          <h1 className="text-xl font-bold text-slate-100">Verifikasi 2FA</h1>
          <p className="text-slate-500 text-sm mt-1">Masukkan kode dari Google Authenticator</p>
        </div>
        <form onSubmit={handleVerify} className="glass-card p-6 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
          {cooldown > 0 && <div className="text-amber-400 text-sm bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-2">Terlalu banyak percobaan. Tunggu {cooldown} detik.</div>}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Kode 6 digit</label>
            <input
              type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
              value={code} onChange={e => setCode(e.target.value)} required
              className="input-field text-center text-2xl tracking-[0.5em]"
              placeholder="000000" autoFocus
            />
          </div>
          <button type="submit" disabled={loading || code.length !== 6 || cooldown > 0} className="btn-primary w-full">
            {loading ? 'Memverifikasi...' : 'Masuk ke Vault'}
          </button>
        </form>
      </div>
    </div>
  )
}
