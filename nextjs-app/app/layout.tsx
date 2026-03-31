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
    default: 'GetAgenzia — ERP & CRM',
    template: '%s | GetAgenzia',
  },
  description: 'ERP & CRM tout-en-un pour les entreprises algeriennes. CRM, Facturation, Comptabilite, RH, Paie.',
  manifest: '/manifest.json',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.agenzia.uk'),
  openGraph: {
    title: 'GetAgenzia — Le CRM intelligent qui close vos deals',
    description: 'Pipeline AI-powered, intégrations natives, et assistant intelligent. CRM gratuit pour les équipes commerciales.',
    siteName: 'GetAgenzia',
    type: 'website',
    images: ['/opengraph-image'],
  },
  themeColor: '#ffffff',
  appleWebApp: {
    title: 'GetAgenzia',
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
