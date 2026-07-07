export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-[var(--bg)] flex flex-col items-center justify-center gap-6">
      <div className="w-8 h-8 border-2 border-[var(--border-2)] border-t-[var(--text-1)] rounded-full animate-spinner-neon" />
      <div className="text-center">
        <p className="text-xs text-[var(--text-4)] font-semibold uppercase tracking-widest">
          Memuat halaman...
        </p>
      </div>
    </div>
  )
}
