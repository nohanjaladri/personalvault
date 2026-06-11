'use client'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function ReEnrollButton() {
  const router = useRouter()

  const handleReEnroll = async () => {
    if (!confirm('Ini akan menghapus TOTP saat ini. Lanjutkan?')) return
    const supabase = createClient()
    const { data } = await supabase.auth.mfa.listFactors()
    const factor = data?.totp?.[0]
    if (factor) await supabase.auth.mfa.unenroll({ factorId: factor.id })
    router.push('/setup-totp')
  }

  return (
    <button
      onClick={handleReEnroll}
      className="text-xs border border-violet-500/30 text-violet-400 rounded-lg px-3 py-1.5 hover:bg-violet-500/10 transition-colors"
    >
      Re-enroll
    </button>
  )
}
