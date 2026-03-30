import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'GetAgenzia — Le CRM intelligent qui close vos deals',
  description:
    'Pipeline AI-powered, integrations natives, et assistant intelligent. CRM gratuit pour les equipes commerciales.',
  openGraph: {
    title: 'GetAgenzia — Le CRM intelligent qui close vos deals',
    description:
      'Pipeline AI-powered, integrations natives, et assistant intelligent. CRM gratuit pour les equipes commerciales.',
    siteName: 'GetAgenzia',
    type: 'website',
  },
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
