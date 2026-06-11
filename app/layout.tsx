import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import ShapeCanvas from '@/components/ShapeCanvas'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'PersonalVault', description: 'Penyimpanan file pribadi' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-[#07050f] text-slate-200 min-h-screen`}>
        <ShapeCanvas />
        <div className="fixed inset-0 z-[1] pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_40%,rgba(7,5,15,0.55)_100%)]" />
        {children}
      </body>
    </html>
  )
}
