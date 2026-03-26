'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { CalendarDays } from 'lucide-react'
import { WidgetSkeleton } from './WidgetCard'

const supabase = createClient()

type LeaveRow = {
  id: string
  start_date: string
  end_date: string
  type: string
  employees: { full_name: string | null } | null
}

const TYPE_LABELS: Record<string, string> = {
  annual: 'Annuel',
  sick: 'Maladie',
  personal: 'Personnel',
  maternity: 'Maternite',
  unpaid: 'Sans solde',
}

export function UpcomingLeaves() {
  const today = new Date().toISOString().split('T')[0]

  const { data: leaves, isLoading } = useQuery({
    queryKey: ['dashboard', 'upcoming-leaves'],
    queryFn: async () => {
      const { data } = await supabase
        .from('leave_requests')
        .select('id, start_date, end_date, type, employees(full_name)')
        .eq('status', 'approved')
        .gte('start_date', today)
        .order('start_date', { ascending: true })
        .limit(5)
      return (data ?? []) as LeaveRow[]
    },
  })

  if (isLoading) return <WidgetSkeleton height={200} />

  if (!leaves || leaves.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-gray-400">
        <CalendarDays className="h-8 w-8 mb-2" />
        <p className="text-sm">Aucun conge a venir</p>
      </div>
    )
  }

  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })

  return (
    <div className="space-y-2">
      {leaves.map((l) => (
        <div key={l.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 transition">
          <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
            <span className="text-xs font-bold text-violet-600">
              {(l.employees?.full_name ?? '?')[0].toUpperCase()}
            </span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm text-slate-700 truncate">{l.employees?.full_name ?? 'Employe'}</p>
            <p className="text-xs text-gray-400">
              {fmtDate(l.start_date)} - {fmtDate(l.end_date)}
            </p>
          </div>
          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">
            {TYPE_LABELS[l.type] ?? l.type}
          </span>
        </div>
      ))}
    </div>
  )
}
