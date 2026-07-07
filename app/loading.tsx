export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center gap-6">
      <div className="w-8 h-8 border-2 border-[#e5e5e5] border-t-[#111111] rounded-full animate-spinner-neon" />
      <div className="text-center">
        <p className="text-xs text-[#a3a3a3] font-semibold uppercase tracking-widest">
          Memuat halaman...
        </p>
      </div>
    </div>
  )
}
