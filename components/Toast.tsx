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
            className="flex items-center gap-3 bg-[#111111] border border-[#333333] rounded px-4 py-3 text-sm text-white shadow-[0_4px_12px_rgba(0,0,0,0.15)] animate-[slideIn_0.3s_ease-out]"
          >
            <span className="w-1.5 h-1.5 rounded-sm bg-[#DC2626] shrink-0" />
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
