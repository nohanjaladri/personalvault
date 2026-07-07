import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = { title: 'Vault', description: 'Penyimpanan file pribadi' }

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body className={`${inter.className} bg-[#fafafa] text-[#111111] min-h-screen`}>
        {children}
      </body>
    </html>
  )
}
