'use client'
import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function SetupTotpPage() {
  const [qrUrl, setQrUrl] = useState('')
  const [factorId, setFactorId] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    const enroll = async () => {
      const supabase = createClient()
      
      // Cek apakah sudah ada factor dengan nama yang sama
      const { data: factorList, error: listError } = await supabase.auth.mfa.listFactors()
      if (listError) {
        console.error('Gagal memuat faktor MFA:', listError)
      }

      const existingFactor = factorList?.all?.find(f => f.friendly_name === 'PersonalVault')
      if (existingFactor) {
        if (existingFactor.status === 'unverified') {
          // Jika unverified, hapus dulu agar kita bisa meminta QR Code baru
          const { error: unenrollError } = await supabase.auth.mfa.unenroll({ factorId: existingFactor.id })
          if (unenrollError) {
            console.error('Gagal unenroll faktor lama:', unenrollError)
          }
        } else {
          // Jika sudah terverifikasi, arahkan langsung ke dashboard/verify
          router.push('/dashboard')
          return
        }
      }

      const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: 'PersonalVault' })
      if (error) {
        console.error('MFA Enroll Error:', error)
        setError(`Gagal mendaftarkan MFA: ${error.message}`)
        return
      }
      if (!data) {
        setError('Gagal memuat data TOTP dari server.')
        return
      }
      setFactorId(data.id)
      setQrUrl(data.totp.qr_code)
    }
    enroll()
  }, [])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const supabase = createClient()
    const { data: challenge } = await supabase.auth.mfa.challenge({ factorId })
    if (!challenge) { setError('Gagal membuat challenge'); setLoading(false); return }
    const { error: err } = await supabase.auth.mfa.verify({ factorId, challengeId: challenge.id, code })
    if (err) { setError('Kode salah, coba lagi'); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }

  const prepareSvg = (svgHtml: string) => {
    let cleaned = svgHtml.startsWith('data:image/svg+xml;utf-8,')
      ? decodeURIComponent(svgHtml.replace('data:image/svg+xml;utf-8,', ''))
      : svgHtml

    // Tambahkan viewBox secara dinamis jika tidak ada agar SVG dapat discale tanpa terpotong
    if (cleaned.includes('<svg') && !cleaned.includes('viewBox')) {
      const widthMatch = cleaned.match(/width="(\d+)"/)
      const heightMatch = cleaned.match(/height="(\d+)"/)
      if (widthMatch && heightMatch) {
        const w = widthMatch[1]
        const h = heightMatch[1]
        cleaned = cleaned.replace('<svg', `<svg viewBox="0 0 ${w} ${h}"`)
      }
    }
    return cleaned
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl mx-auto mb-4 shadow-[0_0_24px_rgba(139,92,246,0.5)]">📱</div>
          <h1 className="text-xl font-bold text-slate-100">Setup Google Authenticator</h1>
          <p className="text-slate-500 text-sm mt-1">Scan QR code dengan aplikasi Google Authenticator</p>
        </div>
        <div className="glass-card p-6 space-y-5">
          {qrUrl && (
            <div className="flex justify-center">
              <div className="bg-white p-3 rounded-xl flex items-center justify-center w-[184px] h-[184px]">
                <div 
                  className="w-[160px] h-[160px] flex items-center justify-center [&>svg]:!w-full [&>svg]:!h-full [&>svg]:block"
                  dangerouslySetInnerHTML={{ __html: prepareSvg(qrUrl) }} 
                />
              </div>
            </div>
          )}
          {!qrUrl && <div className="h-[186px] flex items-center justify-center text-slate-500 text-sm">Memuat QR code...</div>}
          <form onSubmit={handleVerify} className="space-y-4">
            {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
            <div>
              <label className="text-xs font-medium text-slate-400 block mb-1.5">Kode 6 digit dari aplikasi</label>
              <input
                type="text" inputMode="numeric" pattern="\d{6}" maxLength={6}
                value={code} onChange={e => setCode(e.target.value)} required
                className="input-field text-center text-xl tracking-widest"
                placeholder="000000"
              />
            </div>
             <button 
              type="submit" 
              disabled={loading || code.length !== 6} 
              className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 rounded-full border border-white/20 border-t-white animate-spin" />
                  <span>Memverifikasi...</span>
                </>
              ) : (
                'Konfirmasi & Lanjut'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
