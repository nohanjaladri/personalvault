export default function GlobalLoading() {
  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/75 backdrop-blur-md flex flex-col items-center justify-center space-y-4">
      <div className="relative w-16 h-16">
        {/* Glowing aura */}
        <div className="absolute inset-0 rounded-full bg-violet-500/10 blur-xl animate-pulse" />
        {/* Inner track */}
        <div className="absolute inset-0 rounded-full border-4 border-white/5" />
        {/* Spinning gradient arc */}
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-violet-500 border-r-pink-500 animate-spinner-neon shadow-[0_0_20px_rgba(139,92,246,0.4)]" />
      </div>
      <div className="text-center space-y-1">
        <h3 className="text-sm font-bold bg-gradient-to-r from-violet-400 to-pink-400 bg-clip-text text-transparent tracking-wide">
          PERSONAL VAULT
        </h3>
        <p className="text-[10px] text-slate-500 font-semibold uppercase tracking-widest animate-pulse">
          Memuat halaman...
        </p>
      </div>
    </div>
  )
}
