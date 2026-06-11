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
    
    let loginEmail = identifier.trim()

    // Jika input bukan email (tidak mengandung '@'), cari email berdasarkan username di profiles
    if (!loginEmail.includes('@')) {
      const { data: profile, error: profileErr } = await supabase
        .from('profiles')
        .select('email')
        .eq('username', loginEmail.toLowerCase())
        .maybeSingle()
      
      if (profileErr || !profile) {
        setError(profileErr ? profileErr.message : 'Username tidak terdaftar ⚠️')
        setLoading(false)
        return
      }
      loginEmail = profile.email
    }

    const { error: err } = await supabase.auth.signInWithPassword({ email: loginEmail, password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl mx-auto mb-4 shadow-[0_0_24px_rgba(139,92,246,0.5)]">🔐</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">PersonalVault</h1>
          <p className="text-slate-500 text-sm mt-1">Masuk ke akun Anda</p>
        </div>
        
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4 shadow-xl border border-white/10">
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Username / Email</label>
            <input type="text" value={identifier} onChange={e => setIdentifier(e.target.value)} required className="input-field" placeholder="Username atau email" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field" placeholder="••••••••" />
          </div>
          <button type="submit" disabled={loading} className="btn-primary w-full py-2.5 text-sm font-semibold">{loading ? 'Masuk...' : 'Masuk'}</button>
        </form>

        <div className="flex flex-col gap-3 text-center">
          <p className="text-slate-500 text-sm">
            Belum punya akun? <Link href="/register" className="text-violet-400 hover:text-violet-300 transition-colors">Daftar</Link>
          </p>
          
          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/5"></div>
            <span className="flex-shrink mx-4 text-slate-600 text-xs font-semibold uppercase tracking-wider">atau</span>
            <div className="flex-grow border-t border-white/5"></div>
          </div>

          <button 
            onClick={() => router.push('/public-vault')}
            className="w-full py-2.5 rounded-xl bg-violet-600/15 hover:bg-violet-600/25 text-violet-400 border border-violet-500/20 hover:border-violet-500/40 font-semibold transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg"
          >
            🌐 Buka Public Vault (Tanpa Login)
          </button>
        </div>
      </div>
    </div>
  )
}
