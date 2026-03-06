'use client'

import { usePathname } from 'next/navigation'
import Sidebar from './Sidebar'
import Topbar from './Topbar'

const titles: Record<string, string> = {
  '/':                        'Dashboard',
  '/crm/contacts':            'Contacts',
  '/crm/companies':           'Entreprises',
  '/crm/deals':               'Opportunités',
  '/crm/tasks':               'Tâches',
  '/facturation/invoices':    'Factures',
  '/facturation/quotes':      'Devis',
  '/facturation/payments':    'Paiements',
  '/compta/journal':          'Journal comptable',
  '/compta/reports':          'Rapports financiers',
  '/rh/employees':            'Employés',
  '/rh/leaves':               'Congés',
  '/calendar':                'Calendrier',
  '/workflows':               'Workflows',
  '/analytics':               'Analytics',
  '/integrations/gmail':      'Gmail',
  '/integrations/whatsapp':   'WhatsApp',
  '/integrations/instagram':  'Instagram',
  '/settings':                'Paramètres',
}

interface AppLayoutProps {
  children: React.ReactNode
}

export function AppLayout({ children }: AppLayoutProps) {
  const pathname = usePathname()
  const title = titles[pathname] || 'ERPro DZ'

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 overflow-hidden">
        <Topbar title={title} />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
