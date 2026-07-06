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
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const cleanUsername = username.trim().toLowerCase()
    
    // Validasi Username
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUsername)) {
      setError('Username harus 3-20 karakter, hanya huruf, angka, - dan _')
      return
    }
    if (password !== confirm) { setError('Password tidak cocok'); return }
    if (password.length < 8) { setError('Password minimal 8 karakter'); return }
    
    setLoading(true); setError('')
    const supabase = createClient()
    
    // Sign up ke Supabase Auth
    const { data, error: err } = await supabase.auth.signUp({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    
    if (data.user) {
      // Simpan data username ke public.profiles
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({ id: data.user.id, username: cleanUsername, email })
      
      if (profileErr) {
        setError(`Pendaftaran akun berhasil, namun gagal membuat profil: ${profileErr.message}`)
        setLoading(false)
        return
      }
    }
    
    router.push('/dashboard'); router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative z-10 p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center text-2xl mx-auto mb-4 shadow-[0_0_24px_rgba(139,92,246,0.5)]">🔐</div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent">PersonalVault</h1>
          <p className="text-slate-500 text-sm mt-1">Buat akun baru</p>
        </div>
        <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
          {error && <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">{error}</div>}
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Username</label>
            <input type="text" value={username} onChange={e => setUsername(e.target.value)} required className="input-field" placeholder="username_anda" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Email</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="input-field" placeholder="nama@email.com" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required className="input-field" placeholder="Min. 8 karakter" />
          </div>
          <div>
            <label className="text-xs font-medium text-slate-400 block mb-1.5">Konfirmasi Password</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)} required className="input-field" placeholder="Ulangi password" />
          </div>
          <button 
            type="submit" 
            disabled={loading} 
            className="btn-primary w-full py-2.5 text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 rounded-full border border-white/20 border-t-white animate-spin" />
                <span>Mendaftar...</span>
              </>
            ) : (
              'Daftar'
            )}
          </button>
        </form>
        <p className="text-center text-slate-500 text-sm mt-4">
          Sudah punya akun? <Link href="/login" className="text-violet-400 hover:text-violet-300">Masuk</Link>
        </p>
      </div>
    </div>
  )
}
