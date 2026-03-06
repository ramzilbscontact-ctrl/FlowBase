'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Users, Building2, TrendingUp, CheckSquare,
  FileText, Receipt, CreditCard, BookOpen, Calendar,
  Workflow, BarChart3, Mail, MessageCircle, Instagram,
  Settings, ChevronLeft, ChevronRight, UserCheck,
  type LucideProps,
} from 'lucide-react'
import { useState, type FC } from 'react'

type NavSection = { section: string; label?: undefined; icon?: undefined; to?: undefined }
type NavItem = { label: string; icon: FC<LucideProps>; to: string; section?: undefined }
type NavEntry = NavSection | NavItem

const nav: NavEntry[] = [
  { section: 'Principal' },
  { label: 'Dashboard',      icon: LayoutDashboard, to: '/' },
  { section: 'CRM' },
  { label: 'Contacts',       icon: Users,           to: '/crm/contacts' },
  { label: 'Entreprises',    icon: Building2,       to: '/crm/companies' },
  { label: 'Opportunités',   icon: TrendingUp,      to: '/crm/deals' },
  { label: 'Tâches',         icon: CheckSquare,     to: '/crm/tasks' },
  { section: 'Facturation' },
  { label: 'Factures',       icon: FileText,        to: '/facturation/invoices' },
  { label: 'Devis',          icon: Receipt,         to: '/facturation/quotes' },
  { label: 'Paiements',      icon: CreditCard,      to: '/facturation/payments' },
  { section: 'Comptabilité' },
  { label: 'Journal',        icon: BookOpen,        to: '/compta/journal' },
  { label: 'Rapports',       icon: BarChart3,       to: '/compta/reports' },
  { section: 'RH' },
  { label: 'Employés',       icon: UserCheck,       to: '/rh/employees' },
  { label: 'Congés',         icon: Calendar,        to: '/rh/leaves' },
  { section: 'Outils' },
  { label: 'Calendrier',     icon: Calendar,        to: '/calendar' },
  { label: 'Workflows',      icon: Workflow,        to: '/workflows' },
  { label: 'Analytics',      icon: BarChart3,       to: '/analytics' },
  { section: 'Intégrations' },
  { label: 'Gmail',          icon: Mail,            to: '/integrations/gmail' },
  { label: 'WhatsApp',       icon: MessageCircle,   to: '/integrations/whatsapp' },
  { label: 'Instagram',      icon: Instagram,       to: '/integrations/instagram' },
]

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const pathname = usePathname()

  return (
    <aside
      className={`h-screen bg-gray-900 text-white flex flex-col transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      } shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight" style={{ color: '#60a5fa' }}>ERPro DZ</span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-1.5 rounded-lg hover:bg-gray-700 text-gray-400 hover:text-white transition"
        >
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {nav.map((item, i) => {
          if (item.section) {
            return !collapsed ? (
              <p key={i} className="text-xs text-gray-500 uppercase tracking-wider px-3 pt-4 pb-1 font-semibold">
                {item.section}
              </p>
            ) : <div key={i} className="border-t border-gray-700 my-2" />
          }
          const Icon = item.icon
          const isActive = item.to === '/' ? pathname === '/' : pathname.startsWith(item.to)
          return (
            <Link
              key={item.to}
              href={item.to}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                isActive
                  ? 'bg-blue-600 text-white font-medium'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <Icon size={16} className="shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Settings */}
      <div className="border-t border-gray-700 p-2">
        <Link
          href="/settings"
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition"
        >
          <Settings size={16} />
          {!collapsed && <span>Paramètres</span>}
        </Link>
      </div>
    </aside>
  )
}
