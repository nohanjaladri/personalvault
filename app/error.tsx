'use client'
import { useEffect } from 'react'

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('Unhandled runtime error:', error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-slate-950 font-sans">
      <div className="w-full max-w-md glass-card p-6 border border-red-500/20 text-center space-y-4 rounded-2xl shadow-2xl">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-2xl mx-auto mb-2 text-red-400">
          ⚠️
        </div>
        <h1 className="text-xl font-bold text-slate-100">Terjadi Kesalahan Sistem</h1>
        <p className="text-sm text-slate-400 leading-relaxed">
          {error.message || 'Ada masalah saat memuat halaman ini.'}
        </p>
        {error.digest && (
          <code className="block p-2 text-xs font-mono bg-black/40 text-slate-500 rounded-lg select-all">
            Digest: {error.digest}
          </code>
        )}
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-slate-200 transition-colors"
          >
            Muat Ulang Halaman
          </button>
          <button
            onClick={reset}
            className="btn-primary px-5 py-2 text-sm"
          >
            Coba Lagi
          </button>
        </div>
      </div>
    </div>
  )
}
