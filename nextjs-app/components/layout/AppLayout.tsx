'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const titles: Record<string, string> = {
  '/dashboard':                   'Dashboard',
  '/dashboard/contacts':          'Contacts',
  '/dashboard/companies':         'Entreprises',
  '/dashboard/deals':             'Opportunités',
  '/dashboard/tasks':             'Tâches',
  '/dashboard/invoices':          'Factures',
  '/dashboard/quotes':            'Devis',
  '/dashboard/payments':          'Paiements',
  '/dashboard/inventory':         'Inventaire',
  '/dashboard/journal':           'Journal comptable',
  '/dashboard/reports':           'Rapports financiers',
  '/dashboard/employees':         'Employés',
  '/dashboard/leaves':            'Congés',
  '/dashboard/calendar':          'Calendrier',
  '/dashboard/workflows':         'Workflows',
  '/dashboard/analytics':         'Analytics',
  '/dashboard/gmail':             'Gmail',
  '/dashboard/whatsapp':          'WhatsApp',
  '/dashboard/instagram':         'Instagram',
  '/settings':                    'Paramètres',
  '/settings/2fa':                'Authentification 2FA',
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const title = titles[pathname] || 'FlowBase'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {children}
        </main>
      </div>
    </div>
  )
}
