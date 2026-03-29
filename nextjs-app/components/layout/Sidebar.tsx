'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import {
  LayoutDashboard, Users, Building2, TrendingUp, CheckSquare,
  FileText, Receipt, CreditCard, BookOpen, Calendar,
  Workflow, BarChart3, Mail, MessageCircle, Instagram,
  Settings, ChevronLeft, ChevronRight, UserCheck, Package,
  LayoutList, BookMarked, CalendarDays, Wallet, LogOut,
  Search,
  type LucideProps,
} from 'lucide-react'
import { useState, useMemo, type FC } from 'react'

type NavSection = { section: string; label?: undefined; icon?: undefined; to?: undefined; badge?: undefined }
type NavItem = { label: string; icon: FC<LucideProps>; to: string; section?: undefined; badge?: string }
type NavEntry = NavSection | NavItem

const nav: NavEntry[] = [
  { section: 'Principal' },
  { label: 'Dashboard',      icon: LayoutDashboard, to: '/dashboard' },
  { section: 'CRM' },
  { label: 'Contacts',       icon: Users,           to: '/dashboard/contacts' },
  { label: 'Entreprises',    icon: Building2,       to: '/dashboard/companies' },
  { label: 'Opportunités',   icon: TrendingUp,      to: '/dashboard/deals' },
  { label: 'Tâches',         icon: CheckSquare,     to: '/dashboard/tasks' },
  { section: 'Facturation' },
  { label: 'Factures',       icon: FileText,        to: '/dashboard/invoices' },
  { label: 'Devis',          icon: Receipt,         to: '/dashboard/quotes' },
  { label: 'Paiements',      icon: CreditCard,      to: '/dashboard/payments' },
  { section: 'Stock' },
  { label: 'Inventaire',     icon: Package,         to: '/dashboard/inventory' },
  { section: 'Comptabilité' },
  { label: 'Plan comptable', icon: LayoutList,      to: '/dashboard/accounts' },
  { label: 'Journal',        icon: BookOpen,        to: '/dashboard/journal' },
  { label: 'Grand livre',    icon: BookMarked,      to: '/dashboard/ledger' },
  { label: 'Rapports',       icon: BarChart3,       to: '/dashboard/reports' },
  { section: 'RH' },
  { label: 'Employés',       icon: UserCheck,       to: '/dashboard/employees' },
  { label: 'Départements',   icon: Building2,       to: '/dashboard/departments' },
  { label: 'Congés',         icon: CalendarDays,    to: '/dashboard/leaves' },
  { label: 'Paie',           icon: Wallet,          to: '/dashboard/payroll' },
  { section: 'Outils' },
  { label: 'Calendrier',     icon: Calendar,        to: '/dashboard/calendar' },
  { label: 'Workflows',      icon: Workflow,        to: '/dashboard/workflows' },
  { label: 'Analytics',      icon: BarChart3,       to: '/dashboard/analytics' },
  { section: 'Intégrations' },
  { label: 'Gmail',          icon: Mail,            to: '/dashboard/gmail' },
  { label: 'WhatsApp',       icon: MessageCircle,   to: '/dashboard/whatsapp' },
  { label: 'Instagram',      icon: Instagram,       to: '/dashboard/instagram' },
]

// Color palette for active items per section
const sectionColors: Record<string, { bg: string; text: string; ring: string }> = {
  Principal:    { bg: 'bg-violet-500/15', text: 'text-violet-400', ring: 'ring-violet-500/20' },
  CRM:          { bg: 'bg-blue-500/15',   text: 'text-blue-400',   ring: 'ring-blue-500/20' },
  Facturation:  { bg: 'bg-emerald-500/15', text: 'text-emerald-400', ring: 'ring-emerald-500/20' },
  Stock:        { bg: 'bg-amber-500/15',  text: 'text-amber-400',  ring: 'ring-amber-500/20' },
  Comptabilité: { bg: 'bg-cyan-500/15',   text: 'text-cyan-400',   ring: 'ring-cyan-500/20' },
  RH:           { bg: 'bg-pink-500/15',   text: 'text-pink-400',   ring: 'ring-pink-500/20' },
  Outils:       { bg: 'bg-indigo-500/15', text: 'text-indigo-400', ring: 'ring-indigo-500/20' },
  Intégrations: { bg: 'bg-orange-500/15', text: 'text-orange-400', ring: 'ring-orange-500/20' },
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const pathname = usePathname()
  const router = useRouter()

  // Filter nav items based on search
  const filteredNav = useMemo(() => {
    if (!searchQuery.trim()) return nav
    const q = searchQuery.toLowerCase()
    const filtered: NavEntry[] = []
    let lastSection: NavEntry | null = null
    let sectionHasItems = false

    for (const item of nav) {
      if (item.section) {
        if (lastSection && sectionHasItems) {
          filtered.push(lastSection, ...nav.filter(
            n => !n.section && n.label && lastSection?.section && filtered.includes(lastSection)
          ))
        }
        lastSection = item
        sectionHasItems = false
        continue
      }
      if (item.label?.toLowerCase().includes(q)) {
        if (lastSection && !sectionHasItems) {
          filtered.push(lastSection)
          sectionHasItems = true
        }
        filtered.push(item)
      }
    }
    return filtered
  }, [searchQuery])

  // Track which section each item belongs to
  let currentSection = 'Principal'

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Déconnecté')
    router.push('/login')
  }

  return (
    <aside
      className={`h-screen flex flex-col transition-all duration-300 ease-in-out shrink-0 border-r border-white/[0.06] ${
        collapsed ? 'w-[68px]' : 'w-[250px]'
      }`}
      style={{
        background: 'linear-gradient(180deg, #0f0f1a 0%, #141422 50%, #0d0d18 100%)',
      }}
    >
      {/* Header — Search + Collapse */}
      <div className="px-3 pt-4 pb-2 space-y-3">
        {/* Collapse toggle */}
        <button
          onClick={() => { setCollapsed(!collapsed); setSearchQuery('') }}
          className="w-full flex items-center justify-center p-2 rounded-xl hover:bg-white/[0.06] text-gray-500 hover:text-gray-300 transition-all"
          title={collapsed ? 'Ouvrir la sidebar' : 'Réduire la sidebar'}
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>

        {/* Quick search */}
        {!collapsed && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-white/[0.04] border border-white/[0.06] rounded-xl pl-9 pr-3 py-2 text-xs text-gray-300 placeholder-gray-600 focus:outline-none focus:bg-white/[0.08] focus:border-white/[0.12] transition-all"
            />
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-1 space-y-0.5 scrollbar-thin">
        {filteredNav.map((item, i) => {
          if (item.section) {
            currentSection = item.section
            return !collapsed ? (
              <p
                key={i}
                className="text-[10px] text-gray-600 uppercase tracking-[0.1em] font-semibold px-3 pt-5 pb-1.5 select-none"
              >
                {item.section}
              </p>
            ) : (
              <div key={i} className="mx-2 my-3 border-t border-white/[0.04]" />
            )
          }

          const { icon: Icon, to, label } = item as NavItem
          const isActive = to === '/dashboard'
            ? pathname === '/dashboard'
            : pathname.startsWith(to)

          const colors = sectionColors[currentSection] ?? sectionColors.Principal

          return (
            <Link
              key={to}
              href={to}
              title={collapsed ? label : undefined}
              className={`
                group relative flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200
                ${isActive
                  ? `${colors.bg} ${colors.text} ring-1 ${colors.ring}`
                  : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
                }
              `}
            >
              {/* Active indicator bar */}
              {isActive && (
                <span className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-4 rounded-r-full ${colors.text.replace('text-', 'bg-')}`} />
              )}

              <Icon
                size={17}
                className={`shrink-0 transition-colors duration-200 ${
                  isActive ? '' : 'group-hover:text-gray-400'
                }`}
              />

              {!collapsed && (
                <span className="truncate">{label}</span>
              )}

              {/* Badge */}
              {!collapsed && item.badge && (
                <span className="ml-auto text-[10px] font-semibold bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded-md">
                  {item.badge}
                </span>
              )}

              {/* Tooltip for collapsed mode */}
              {collapsed && (
                <span className="absolute left-full ml-3 px-2.5 py-1.5 bg-gray-900 text-gray-200 text-xs rounded-lg shadow-xl border border-white/10 opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity whitespace-nowrap z-50">
                  {label}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {/* Footer — Settings + Logout */}
      <div className="border-t border-white/[0.06] p-2.5 space-y-0.5">
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium transition-all duration-200 ${
            pathname.startsWith('/settings')
              ? 'bg-white/[0.08] text-gray-200'
              : 'text-gray-500 hover:text-gray-300 hover:bg-white/[0.04]'
          }`}
          title={collapsed ? 'Paramètres' : undefined}
        >
          <Settings size={17} className="shrink-0" />
          {!collapsed && <span>Paramètres</span>}
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-[13px] font-medium text-gray-500 hover:text-red-400 hover:bg-red-500/[0.08] transition-all duration-200"
          title={collapsed ? 'Déconnexion' : undefined}
        >
          <LogOut size={17} className="shrink-0" />
          {!collapsed && <span>Déconnexion</span>}
        </button>
      </div>
    </aside>
  )
}
