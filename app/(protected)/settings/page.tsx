'use client'
import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/utils/format'
import { useToast } from '@/components/Toast'
import ReEnrollButton from './ReEnrollButton'

type FileRow = { size: number }
type Profile = { username: string; email: string }

export default function SettingsPage() {
  const [user, setUser] = useState<any>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [files, setFiles] = useState<FileRow[]>([])
  
  // State Edit Username
  const [usernameInput, setUsernameInput] = useState('')
  const [savingUsername, setSavingUsername] = useState(false)
  
  // State Edit Password
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [updatingPassword, setUpdatingPassword] = useState(false)

  // State Google Drive
  const [isGDriveConnected, setIsGDriveConnected] = useState(false)
  const [disconnectingGDrive, setDisconnectingGDrive] = useState(false)

  const router = useRouter()
  const supabase = createClient()
  const { showToast } = useToast()

  const loadData = async () => {
    const { data: { user: currentUser } } = await supabase.auth.getUser()
    if (!currentUser) {
      router.push('/login')
      return
    }
    setUser(currentUser)

    // Load profile (username)
    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', currentUser.id)
      .maybeSingle()
    
    if (profileData) {
      setProfile(profileData)
      setUsernameInput(profileData.username)
    } else {
      // Jika profile belum terbuat, buat default
      const defaultUsername = currentUser.email?.split('@')[0] || 'user'
      setProfile({ username: defaultUsername, email: currentUser.email || '' })
      setUsernameInput(defaultUsername)
    }

    // Load files for storage space
    const { data: filesData } = await supabase
      .from('files')
      .select('size')
      .eq('user_id', currentUser.id)
    
    if (filesData) setFiles(filesData)

    // Cek koneksi Google Drive
    try {
      const res = await fetch('/api/auth/google/status')
      const statusData = await res.json()
      setIsGDriveConnected(!!statusData.isConnected)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => {
    loadData()

    // Membaca URL parameter untuk memberikan notifikasi status integrasi Google Drive
    const searchParams = new URLSearchParams(window.location.search)
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')

    if (successParam === 'google_connected') {
      showToast('Google Drive berhasil terhubung! 🎉')
      // Bersihkan query param agar tidak memicu ulang toast saat direfresh
      router.replace('/settings')
    } else if (errorParam === 'oauth_denied') {
      showToast('Koneksi Google Drive dibatalkan atau ditolak ⚠️')
      router.replace('/settings')
    } else if (errorParam === 'db_error' || errorParam === 'oauth_exception') {
      showToast('Gagal menghubungkan Google Drive ❌')
      router.replace('/settings')
    }
  }, [])

  const handleConnectGDrive = () => {
    // Arahkan ke endpoint login OAuth Google internal
    window.location.href = '/api/auth/google/login'
  }

  const handleDisconnectGDrive = async () => {
    if (!confirm('Apakah Anda yakin ingin memutuskan koneksi Google Drive? (Berkas besar yang sudah diunggah tidak akan terhapus di Drive Anda, namun aplikasi tidak dapat mengaksesnya lagi)')) {
      return
    }

    setDisconnectingGDrive(true)
    try {
      const res = await fetch('/api/auth/google/status', { method: 'DELETE' })
      if (res.ok) {
        setIsGDriveConnected(false)
        showToast('Koneksi Google Drive diputuskan 🔒')
      } else {
        showToast('Gagal memutuskan koneksi Google Drive ❌')
      }
    } catch (err) {
      console.error(err)
      showToast('Gagal memproses permintaan ❌')
    } finally {
      setDisconnectingGDrive(false)
    }
  }

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const cleanUsername = usernameInput.trim().toLowerCase()
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUsername)) {
      showToast('Username harus 3-20 karakter alfanumerik, - atau _ ⚠️')
      return
    }

    setSavingUsername(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, username: cleanUsername, email: user.email || '' })

      if (error) {
        showToast(`Gagal mengubah username: ${error.message} ❌`)
      } else {
        showToast('Username berhasil diperbarui ✨')
        setProfile(prev => prev ? { ...prev, username: cleanUsername } : null)
        startTransition(() => {
          router.refresh()
        })
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan sistem ❌')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) {
      showToast('Password minimal 8 karakter! ⚠️')
      return
    }
    if (newPassword !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok! ⚠️')
      return
    }

    setUpdatingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setUpdatingPassword(false)

    if (error) {
      showToast(`Gagal mengganti password: ${error.message} ❌`)
    } else {
      showToast('Password berhasil diganti! 🔑')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xl text-violet-400 animate-spin">⏳</div>
        <p className="text-sm text-slate-500 animate-pulse">Memuat pengaturan...</p>
      </div>
    )
  }

  const usedBytes = files.reduce((s, f) => s + (f.size as number), 0)
  const usedPct = Math.min((usedBytes / (10 * 1_073_741_824)) * 100, 100).toFixed(1)

  return (
    <div className="max-w-2xl space-y-6 pb-12">
      <h1 className="text-xl font-bold text-slate-100 mb-2">Pengaturan Akun & Brankas</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column: Profile Updates & Storage */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="glass-card p-6 space-y-4 border border-white/10 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Profil Saya</h3>
            
            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Username</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    required
                    disabled={savingUsername}
                    value={usernameInput}
                    onChange={e => setUsernameInput(e.target.value)}
                    className="input-field text-sm"
                    placeholder="username"
                  />
                  <button
                    type="submit"
                    disabled={savingUsername || !!(profile && profile.username === usernameInput.trim().toLowerCase())}
                    className="btn-primary py-2 px-4 whitespace-nowrap text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none"
                  >
                    {savingUsername ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-slate-500 block mb-1.5">Email (Akun Aktif)</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="input-field text-sm opacity-50 cursor-not-allowed bg-slate-900 border-white/5"
                />
              </div>
            </form>
          </div>

          {/* Storage Capacity Card */}
          <div className="glass-card p-6 space-y-4 border border-white/10 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Kapasitas Penyimpanan</h3>
            <div className="flex justify-between text-sm text-slate-300 mb-1">
              <span>{formatFileSize(usedBytes)} digunakan</span>
              <span className="text-violet-400 font-semibold">{usedPct}% dari 10 GB</span>
            </div>
            <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-violet-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-500">{files.length} file tersimpan aman di dalam brankas Anda.</p>
          </div>
        </div>

        {/* Right Column: Security, Password & TOTP */}
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="glass-card p-6 space-y-4 border border-white/10 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Ganti Password</h3>
            
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Password Baru</label>
                <input
                  type="password"
                  required
                  disabled={updatingPassword}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Min. 8 karakter"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-400 block mb-1.5">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  required
                  disabled={updatingPassword}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="input-field text-sm"
                  placeholder="Ulangi password baru"
                />
              </div>

              <button
                type="submit"
                disabled={updatingPassword || !newPassword}
                className="btn-primary w-full py-2 text-sm cursor-pointer disabled:opacity-50"
              >
                {updatingPassword ? 'Memperbarui...' : '🔑 Ubah Password'}
              </button>
            </form>
          </div>

          {/* MFA 2FA Settings Card */}
          <div className="glass-card p-6 space-y-4 border border-white/10 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Keamanan Tambahan</h3>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-200">Google Authenticator (TOTP)</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Lakukan pengaturan ulang (*Re-enroll*) jika Anda mengganti perangkat HP baru atau mereset aplikasi authenticator Anda.
                </p>
              </div>
              <ReEnrollButton />
            </div>
          </div>

          {/* Google Drive Integration Card */}
          <div className="glass-card p-6 space-y-4 border border-white/10 shadow-xl">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Penyimpanan Tambahan</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-semibold text-slate-200">Google Drive Integration</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Hubungkan Google Drive Anda untuk menyimpan foto, video, audio, dokumen, dan berkas lainnya (terbagi ke subfolder terpisah). Catatan teks dan kode pemrograman tetap disimpan di brankas utama.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${isGDriveConnected ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  <span className="text-xs text-slate-400">
                    {isGDriveConnected ? 'Terhubung' : 'Terputus'}
                  </span>
                </div>
                {isGDriveConnected ? (
                  <button
                    onClick={handleDisconnectGDrive}
                    disabled={disconnectingGDrive}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 hover:border-red-500/40 transition-colors cursor-pointer"
                  >
                    {disconnectingGDrive ? 'Memutuskan...' : 'Putuskan Koneksi'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGDrive}
                    className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-violet-600 hover:bg-violet-700 text-white transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <span>🔑</span> Hubungkan Drive
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
