import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import Topbar from '@/components/Topbar'
import { ToastProvider } from '@/components/Toast'

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Total used bytes
  const { data: files } = await supabase.from('files').select('size').eq('user_id', user.id)
  const usedBytes = (files ?? []).reduce((sum, f) => sum + (f.size as number), 0)

  return (
    <ToastProvider>
      <div className="flex h-screen relative z-10">
        <Sidebar usedBytes={usedBytes} />
        <div className="flex-1 flex flex-col overflow-hidden">
          <Topbar email={user.email ?? ''} />
          <main className="flex-1 overflow-y-auto p-4 md:p-7 scrollbar-thin">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
