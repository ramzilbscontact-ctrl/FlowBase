'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { WidgetSkeleton } from './WidgetCard'

const supabase = createClient()

type AuditRow = {
  id: string
  action: string
  resource: string
  resource_id: string | null
  created_at: string
}

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  create: { bg: 'bg-green-100', text: 'text-green-700', label: 'Cree' },
  update: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Modifie' },
  delete: { bg: 'bg-red-100', text: 'text-red-700', label: 'Supprime' },
  login: { bg: 'bg-gray-100', text: 'text-gray-600', label: 'Connexion' },
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "a l'instant"
  if (mins < 60) return `il y a ${mins}min`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `il y a ${hours}h`
  const days = Math.floor(hours / 24)
  return `il y a ${days}j`
}

const RESOURCE_FR: Record<string, string> = {
  contacts: 'Contact',
  companies: 'Entreprise',
  deals: 'Opportunite',
  tasks: 'Tache',
  invoices: 'Facture',
  quotes: 'Devis',
  employees: 'Employe',
  leave_requests: 'Conge',
  journal_entries: 'Ecriture',
}

export function RecentActivity() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ['dashboard', 'activity'],
    queryFn: async () => {
      const { data } = await supabase
        .from('audit_logs')
        .select('id, action, resource, resource_id, created_at')
        .order('created_at', { ascending: false })
        .limit(10)
      return (data ?? []) as AuditRow[]
    },
  })

  if (isLoading) return <WidgetSkeleton height={160} />

  if (!logs || logs.length === 0) {
    return (
      <div className="flex items-center justify-center py-6 text-sm text-gray-400">
        Aucune activite recente
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1">
      {logs.map((log) => {
        const style = ACTION_STYLES[log.action] ?? ACTION_STYLES.update
        return (
          <div key={log.id} className="flex items-center gap-3 py-2 px-2 rounded-lg hover:bg-gray-50 transition">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${style.bg} ${style.text} shrink-0`}>
              {style.label}
            </span>
            <span className="text-sm text-slate-600 truncate flex-1">
              {RESOURCE_FR[log.resource] ?? log.resource}
            </span>
            <span className="text-xs text-gray-400 shrink-0">{relativeTime(log.created_at)}</span>
          </div>
        )
      })}
    </div>
  )
}
