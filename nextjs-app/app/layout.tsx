import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: {
    default: 'FlowBase — ERP & CRM',
    template: '%s | FlowBase',
  },
  description: 'ERP & CRM tout-en-un pour les entreprises algeriennes. CRM, Facturation, Comptabilite, RH, Paie.',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'),
  openGraph: {
    title: 'FlowBase — ERP & CRM',
    description: 'ERP & CRM tout-en-un pour les entreprises algeriennes',
    siteName: 'FlowBase',
    type: 'website',
  },
  themeColor: '#ffffff',
  appleWebApp: {
    title: 'FlowBase',
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  )
}
