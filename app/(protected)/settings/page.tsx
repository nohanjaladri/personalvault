'use client'
import { useEffect, useState, startTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatFileSize } from '@/lib/utils/format'
import { useToast } from '@/components/Toast'

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

    const { data: profileData } = await supabase
      .from('profiles')
      .select('username, email')
      .eq('id', currentUser.id)
      .maybeSingle()

    if (profileData) {
      setProfile(profileData)
      setUsernameInput(profileData.username)
    } else {
      const defaultUsername = currentUser.email?.split('@')[0] || 'user'
      setProfile({ username: defaultUsername, email: currentUser.email || '' })
      setUsernameInput(defaultUsername)
    }

    const { data: filesData } = await supabase
      .from('files')
      .select('size')
      .eq('user_id', currentUser.id)

    if (filesData) setFiles(filesData)

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

    const searchParams = new URLSearchParams(window.location.search)
    const successParam = searchParams.get('success')
    const errorParam = searchParams.get('error')

    if (successParam === 'google_connected') {
      showToast('Google Drive berhasil terhubung')
      router.replace('/settings')
    } else if (errorParam === 'oauth_denied') {
      showToast('Koneksi Google Drive dibatalkan')
      router.replace('/settings')
    } else if (errorParam === 'db_error' || errorParam === 'oauth_exception') {
      showToast('Gagal menghubungkan Google Drive')
      router.replace('/settings')
    }
  }, [])

  const handleConnectGDrive = () => {
    window.location.href = '/api/auth/google/login'
  }

  const handleDisconnectGDrive = async () => {
    if (!confirm('Apakah Anda yakin ingin memutuskan koneksi Google Drive?')) return

    setDisconnectingGDrive(true)
    try {
      const res = await fetch('/api/auth/google/status', { method: 'DELETE' })
      if (res.ok) {
        setIsGDriveConnected(false)
        showToast('Koneksi Google Drive diputuskan')
      } else {
        showToast('Gagal memutuskan koneksi Google Drive')
      }
    } catch (err) {
      console.error(err)
      showToast('Gagal memproses permintaan')
    } finally {
      setDisconnectingGDrive(false)
    }
  }

  const handleUpdateUsername = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    const cleanUsername = usernameInput.trim().toLowerCase()
    if (!/^[a-zA-Z0-9_-]{3,20}$/.test(cleanUsername)) {
      showToast('Username harus 3-20 karakter alfanumerik, - atau _')
      return
    }

    setSavingUsername(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert({ id: user.id, username: cleanUsername, email: user.email || '' })

      if (error) {
        showToast(`Gagal mengubah username: ${error.message}`)
      } else {
        showToast('Username berhasil diperbarui')
        setProfile(prev => prev ? { ...prev, username: cleanUsername } : null)
        startTransition(() => { router.refresh() })
      }
    } catch (err) {
      console.error(err)
      showToast('Terjadi kesalahan sistem')
    } finally {
      setSavingUsername(false)
    }
  }

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (newPassword.length < 8) { showToast('Password minimal 8 karakter'); return }
    if (newPassword !== confirmPassword) { showToast('Konfirmasi password tidak cocok'); return }

    setUpdatingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setUpdatingPassword(false)

    if (error) {
      showToast(`Gagal mengganti password: ${error.message}`)
    } else {
      showToast('Password berhasil diganti')
      setNewPassword('')
      setConfirmPassword('')
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-8 h-8 border-2 border-[#e5e5e5] border-t-[#111111] rounded-full animate-spinner-neon" />
        <p className="text-sm text-[#a3a3a3]">Memuat pengaturan...</p>
      </div>
    )
  }

  const usedBytes = files.reduce((s, f) => s + (f.size as number), 0)
  const usedPct = Math.min((usedBytes / (10 * 1_073_741_824)) * 100, 100).toFixed(1)

  return (
    <div className="max-w-2xl space-y-8 pb-16">
      {/* Page header */}
      <div className="border-b border-[var(--border)] pb-6">
        <p className="text-xs font-semibold text-[#DC2626] uppercase tracking-widest mb-1">Vault</p>
        <h1 className="text-2xl font-black text-[var(--text-1)]">Pengaturan</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
        {/* Left Column */}
        <div className="space-y-6">
          {/* Profile Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-4)]">Profil Saya</h3>

            <form onSubmit={handleUpdateUsername} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-2)] block mb-2 uppercase tracking-wider">Username</label>
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
                    className="btn-primary py-2 px-4 whitespace-nowrap text-xs cursor-pointer"
                  >
                    {savingUsername ? 'Menyimpan...' : 'Simpan'}
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-[var(--text-4)] block mb-2 uppercase tracking-wider">Email</label>
                <input
                  type="email"
                  disabled
                  value={user.email || ''}
                  className="input-field text-sm"
                />
              </div>
            </form>
          </div>

          {/* Storage Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-4)]">Kapasitas Penyimpanan</h3>
            <div className="flex justify-between text-sm text-[var(--text-1)] mb-2">
              <span>{formatFileSize(usedBytes)} digunakan</span>
              <span className="text-[#DC2626] font-bold">{usedPct}%</span>
            </div>
            <div className="h-1.5 bg-[var(--surface-2)] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#DC2626] transition-all duration-500"
                style={{ width: `${usedPct}%` }}
              />
            </div>
            <p className="text-xs text-[var(--text-4)]">{files.length} file · batas 10 GB</p>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Change Password Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-4)]">Ganti Password</h3>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[var(--text-2)] block mb-2 uppercase tracking-wider">Password Baru</label>
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
                <label className="text-xs font-semibold text-[var(--text-2)] block mb-2 uppercase tracking-wider">Konfirmasi Password</label>
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
                className="btn-primary w-full py-2.5 text-sm cursor-pointer"
              >
                {updatingPassword ? 'Memperbarui...' : 'Ubah Password'}
              </button>
            </form>
          </div>

          {/* Google Drive Card */}
          <div className="bg-[var(--surface)] border border-[var(--border)] rounded p-6 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-widest text-[var(--text-4)]">Penyimpanan Tambahan</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-[var(--text-1)]">Google Drive</p>
                <p className="text-xs text-[var(--text-3)] mt-1 leading-relaxed">
                  Hubungkan Google Drive untuk menyimpan foto, video, audio, dan dokumen secara terpisah.
                </p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-sm ${isGDriveConnected ? 'bg-emerald-500' : 'bg-[#DC2626]'}`} />
                  <span className="text-xs text-[var(--text-3)]">
                    {isGDriveConnected ? 'Terhubung' : 'Terputus'}
                  </span>
                </div>
                {isGDriveConnected ? (
                  <button
                    onClick={handleDisconnectGDrive}
                    disabled={disconnectingGDrive}
                    className="btn-danger text-xs py-1.5 px-3 cursor-pointer"
                  >
                    {disconnectingGDrive ? 'Memutuskan...' : 'Putuskan Koneksi'}
                  </button>
                ) : (
                  <button
                    onClick={handleConnectGDrive}
                    className="btn-primary text-xs py-1.5 px-3 cursor-pointer"
                  >
                    Hubungkan Drive
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
