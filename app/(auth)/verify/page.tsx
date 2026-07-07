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
    <div className="min-h-screen bg-[#fafafa] flex flex-col">
      <div className="h-px bg-[#DC2626] w-full shrink-0" />

      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Header */}
          <div className="mb-10">
            <span className="text-[10px] font-bold text-[#DC2626] uppercase tracking-[0.2em] block mb-3">
              Vault
            </span>
            <h1 className="text-2xl font-black text-[#111111] leading-tight tracking-tight">
              Verifikasi 2FA
            </h1>
            <p className="text-sm text-[#737373] mt-2">
              Masukkan kode 6 digit dari Google Authenticator.
            </p>
          </div>

          <form onSubmit={handleVerify} className="space-y-5">
            {error && (
              <div className="text-sm text-[#DC2626] bg-[#fef2f2] border border-[#fca5a5] rounded px-4 py-3">
                {error}
              </div>
            )}
            {cooldown > 0 && (
              <div className="text-sm text-[#525252] bg-[#f5f5f5] border border-[#e5e5e5] rounded px-4 py-3">
                Terlalu banyak percobaan. Tunggu{' '}
                <strong className="text-[#111111]">{cooldown}</strong> detik.
              </div>
            )}

            <div>
              <label className="label" htmlFor="totp-code">Kode 6 digit</label>
              <input
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                value={code}
                onChange={e => setCode(e.target.value)}
                required
                className="input-field text-center text-2xl tracking-[0.5em] font-mono"
                placeholder="000000"
                autoFocus
              />
            </div>

            <button
              type="submit"
              disabled={loading || code.length !== 6 || cooldown > 0}
              className="btn-primary w-full py-3 text-sm cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spinner-neon" />
                  Memverifikasi...
                </span>
              ) : 'Masuk ke Vault'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
