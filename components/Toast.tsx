'use client'
import { createContext, useCallback, useContext, useState } from 'react'

type ToastItem = { id: number; message: string }
type ToastCtx = { showToast: (msg: string) => void }

const ToastContext = createContext<ToastCtx>({ showToast: () => {} })
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string) => {
    const id = Date.now()
    setToasts(t => [...t, { id, message }])
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3000)
  }, [])

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="flex items-center gap-3 bg-[rgba(14,10,30,0.95)] border border-violet-500/40
                       rounded-xl px-5 py-3 text-sm backdrop-blur-2xl
                       shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_20px_rgba(139,92,246,0.2)]
                       animate-[slideIn_0.4s_cubic-bezier(0.34,1.56,0.64,1)]"
          >
            <div className="w-2 h-2 rounded-full bg-gradient-to-b from-violet-500 to-pink-500 animate-pulse shrink-0" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
