import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: 'VynCICD · VynOps Suite',
  description: 'AI-powered CI/CD pipeline platform with failure triage, Kubernetes-native deployments, DORA metrics, and smart notifications.',
  icons: { icon: '/favicon-circle.png', shortcut: '/favicon-circle.png', apple: '/favicon-circle.png' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full bg-[#0b0f1a] text-white antialiased">{children}</body>
    </html>
  )
}
